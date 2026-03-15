import { StyleSheet, View } from "react-native";
import { useOAuth } from "@clerk/clerk-expo";
import { TouchableOpacity, Text } from "react-native";

export default function AuthScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const handleSignIn = async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow();
      if (createdSessionId && setActive) {
        setActive({ session: createdSessionId });
      }
    } catch (err) {
      console.error("OAuth error:", err);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Swrm</Text>
      <Text style={styles.subtitle}>AI Agents in your pocket</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleSignIn}>
        <Text style={styles.buttonText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
    gap: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: "700",
    color: "#FFF",
  },
  subtitle: {
    fontSize: 18,
    color: "#8E8E93",
    marginBottom: 40,
  },
  button: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFF",
  },
});
