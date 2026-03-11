import { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { useQuery } from 'convex/react';
import { initDatabase } from './lib/db';
import { registerForPushNotifications } from './lib/notifications';

// Import Convex API (will be generated)
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL;

// Create Convex client (only if URL is set)
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

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

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

  if (!CONVEX_URL) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#000' }}>
        <StatusBar style="light" />
      </View>
    );
  }

  return (
    <ConvexProvider client={convex!}>
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
  const [hasCheckedAgents, setHasCheckedAgents] = useState(false);
  const [hasAgents, setHasAgents] = useState(false);

  // Register push notifications when signed in
  useEffect(() => {
    if (isSignedIn && userId) {
      registerForPushNotifications(userId);
    }
  }, [isSignedIn, userId]);

  // Check if user has agents (for onboarding)
  useEffect(() => {
    if (isSignedIn && userId && convex) {
      // For now, skip agent check and go to main app
      // TODO: Query Convex for agent count
      setHasAgents(true);
      setHasCheckedAgents(true);
    }
  }, [isSignedIn, userId]);

  // Loading state
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

  // Checking agents
  if (!hasCheckedAgents) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // No agents → Setup wizard
  if (!hasAgents) {
    return (
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(setup)" />
      </Stack>
    );
  }

  // Has agents → Main app
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(app)" />
    </Stack>
  );
}
