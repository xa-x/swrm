import { Redirect } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";

export default function OnboardingIndex() {
  const { isSignedIn, isLoaded } = useAuth();

  if (!isLoaded) return null;

  if (isSignedIn) {
    return <Redirect href="/(app)" />;
  }

  return <Redirect href="/(auth)" />;
}
