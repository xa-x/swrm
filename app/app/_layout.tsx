import { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { api } from '../lib/api';
import { initDatabase } from '../lib/db';
import { registerForPushNotifications } from '../lib/notifications';

// Clerk token cache
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch {
      return;
    }
  },
};

SplashScreen.preventAutoHideAsync();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_KEY || '';

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [dbReady, setDbReady] = useState(false);

  const [fontsLoaded] = useFonts({
    // Load system fonts for markdown
  });

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (e) {
        console.warn('DB init failed:', e);
        setDbReady(true); // Continue anyway
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && dbReady) {
      await SplashScreen.hideAsync();
      setAppReady(true);
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
        <StatusBar style="auto" />
        <RootNavigator />
      </View>
    </ClerkProvider>
  );
}

function RootNavigator() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const [hasAgents, setHasAgents] = useState<boolean | null>(null);

  useEffect(() => {
    if (isSignedIn && userId) {
      // Register for push notifications
      registerForPushNotifications(userId);
      // Load API token
      api.loadToken();
      // Check if user has agents
      api.getAgents().then(({ agents }) => {
        setHasAgents(agents.length > 0);
      }).catch(() => setHasAgents(false));
    }
  }, [isSignedIn, userId]);

  if (!isLoaded) {
    return null; // Loading state
  }

  // Not signed in → Auth flow
  if (!isSignedIn) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  // Signed in but no agents → Setup wizard
  if (hasAgents === false) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(setup)" />
      </Stack>
    );
  }

  // Signed in with agents → Main app
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
