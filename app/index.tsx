import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useAuth } from "@clerk/expo";
import { useConvexAuth } from "convex/react";
import { registerForPushNotifications } from "@/lib/notifications";
import { useAgents } from "@/lib/hooks";
import { Redirect } from "expo-router";

export default function Onboaeding() {
  const { isLoaded, userId, isSignedIn } = useAuth();
  const { isAuthenticated } = useConvexAuth();

  useEffect(() => {
    if (isSignedIn && userId) {
      registerForPushNotifications(userId).catch(console.warn);
    }
  }, [isSignedIn, userId]);

  // Always call useAgents to maintain consistent hook order
  const agents = useAgents(isAuthenticated && userId ? userId : null);

  // 1. Loading state (Clerk)
  if (!isLoaded) {
    return null;
  }

  // 2. Not signed into Clerk → Auth flow
  if (!isSignedIn) {
    return <Redirect href="/(auth)" />;
  }

  // 3. Loading agents from Convex
  // if (agents === undefined) {
  //   return (
  //     <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' }}>
  //       <ActivityIndicator size="large" color="#007AFF" />
  //       <Text style={{ marginTop: 16, color: '#8E8E93' }}>Loading data...</Text>
  //     </View>
  //   );
  // }

  // No agents → Setup wizard
  // if (agents.length === 0) {
  //   return <Redirect href="/(setup)" />;
  // }

  // Has agents → Main app
  return <Redirect href="/(app)" />;
}
