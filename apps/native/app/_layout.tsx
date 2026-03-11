import { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';
import { initDatabase } from '../lib/db';
import { registerForPushNotifications } from '../lib/notifications';

// Convex client
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;
const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

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
  const [dbReady, setDbReady] = useState(false);

  const [fontsLoaded] = useFonts({});

  useEffect(() => {
    async function prepare() {
      try {
        await initDatabase();
        setDbReady(true);
      } catch (e) {
        console.warn('DB init failed:', e);
        setDbReady(true);
      }
    }
    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && dbReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

  if (!fontsLoaded || !dbReady) {
    return null;
  }

  if (!convex) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <ConvexProvider client={convex}>
      <ClerkProvider
        publishableKey={CLERK_PUBLISHABLE_KEY}
        tokenCache={tokenCache}
      >
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <StatusBar style="auto" />
          <RootNavigator />
        </View>
      </ClerkProvider>
    </ConvexProvider>
  );
}

function RootNavigator() {
  const { isSignedIn, isLoaded, userId } = useAuth();

  // TODO: Use Convex query once api is generated
  // const agents = useQuery(api.agents.list, userId ? { userId } : "skip");

  useEffect(() => {
    if (isSignedIn && userId) {
      registerForPushNotifications(userId);
    }
  }, [isSignedIn, userId]);

  if (!isLoaded) {
    return null;
  }

  // Not signed in → Auth flow
  if (!isSignedIn) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
      </Stack>
    );
  }

  // For now, skip setup check and go to main app
  // TODO: Add agent count check once Convex is connected
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
