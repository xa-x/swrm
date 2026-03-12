/**
 * Root Layout
 *
 * Handles:
 * - App initialization (fonts, database)
 * - Authentication state (Clerk)
 * - Backend connection (Convex)
 * - Navigation routing based on auth + onboarding state
 */

import { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { ConvexProvider, ConvexReactClient, useQuery } from 'convex/react';
import { initDatabase } from '@/lib/db';
import { registerForPushNotifications } from '@/lib/notifications';
import { api } from '@swrm/backend/convex/_generated/api';

// Convex URL from environment
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

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '';

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({});

  // Initialize database
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

  // Hide splash screen when ready
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded && dbReady) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, dbReady]);

  // Loading state
  if (!fontsLoaded || !dbReady) {
    return null;
  }

  // No Convex URL configured
  if (!CONVEX_URL) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#000' }}>
        <StatusBar style="light" />
        <Text style={{ color: '#fff', fontSize: 16, textAlign: 'center' }}>
          Backend not configured. Set EXPO_PUBLIC_CONVEX_URL in .env
        </Text>
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
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(app)" />
            <Stack.Screen name="(setup)" />
          </Stack>
        </View>
      </ClerkProvider>
    </ConvexProvider>
  );
}

/**
 * Root Navigator
 *
 * Routes based on:
 * 1. Auth state (signed in?)
 * 2. Onboarding state (has agents?)
 */
// function RootNavigator() {
//   const { isSignedIn, isLoaded, userId } = useAuth();

//   // Query agents for onboarding check
//   const agents = useQuery(
//     isSignedIn && userId ? api.agents.list : 'skip',
//     isSignedIn && userId ? { userId } : undefined
//   );

//   // Register push notifications when signed in
//   useEffect(() => {
//     if (isSignedIn && userId) {
//       registerForPushNotifications(userId).catch(console.warn);
//     }
//   }, [isSignedIn, userId]);

//   // Loading state (Clerk)
//   if (!isLoaded) {
//     return null;
//   }

//   // Not signed in → Auth flow
//   if (!isSignedIn) {
//     return (
//       <Stack screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="(auth)" />
//       </Stack>
//     );
//   }

//   // Loading state (Convex query)
//   if (agents === undefined) {
//     return (
//       <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </View>
//     );
//   }

//   // No agents → Setup wizard
//   if (!agents || agents.length === 0) {
//     return (
//       <Stack screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="(setup)" />
//       </Stack>
//     );
//   }

//   // Has agents → Main app
//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       <Stack.Screen name="(app)" />
//     </Stack>
//   );
// }
