
import { useCallback, useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { ClerkProvider, useAuth } from '@clerk/expo';
import * as SecureStore from 'expo-secure-store';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { initDatabase } from '@/lib/db';
import { registerForPushNotifications } from '@/lib/notifications';
import { useAgents } from '@/lib/hooks';
import { Redirect } from 'expo-router';

export default function RootNavigator() {
  const { isSignedIn, isLoaded, userId } = useAuth();

  // Register push notifications when signed in
  useEffect(() => {
    if (isSignedIn && userId) {
      registerForPushNotifications(userId).catch(console.warn);
    }
  }, [isSignedIn, userId]);

  // Always call useAgents to maintain consistent hook order
  // We pass userId only when signed in, otherwise null
  const agents = useAgents(isSignedIn ? userId : null);

  // Loading state (Clerk)
  if (!isLoaded) {
    return null;
  }

  // Not signed in → Auth flow
  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // Loading state (Convex query for agents)
  if (agents === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // No agents → Setup wizard
  if (agents.length === 0) {
    return <Redirect href="/(setup)" />;
  }

  // Has agents → Main app
  return <Redirect href="/(app)" />;
}
