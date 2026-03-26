import { Stack } from "expo-router";
import { ClerkProvider, ClerkLoaded } from "@clerk/clerk-expo";
import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Slot } from "expo-router";
import { TRPCProvider } from "../lib/trpc-provider";

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

function AuthGuard() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (!isSignedIn) {
    return <Redirect href="/(auth)" />;
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <ClerkLoaded>
        <TRPCProvider>
          <AuthGuard />
        </TRPCProvider>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
