import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth, SignIn } from '@clerk/clerk-expo';

export default function AuthScreen() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  if (isSignedIn) {
    router.replace('/');
    return null;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.logo}>🐝</Text>
          <Text style={styles.title}>Swrm</Text>
          <Text style={styles.subtitle}>Deploy AI agents. Swarm together.</Text>
        </View>

        <View style={styles.auth}>
          <SignIn routing="hash" />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: {
    fontSize: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 18,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  auth: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 16,
  },
});
