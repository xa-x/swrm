import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function SetupScreen() {
  const handleCreateFirstAgent = () => {
    router.replace('/create');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.logo}>🐝</Text>
          <Text style={styles.title}>Swrm</Text>
          <Text style={styles.subtitle}>
            Deploy AI agents. Swarm together.
          </Text>
        </View>

        <View style={styles.features}>
          <FeatureItem
            icon="🤖"
            title="AI Agents"
            desc="Deploy powerful agents with your own API keys"
          />
          <FeatureItem
            icon="💬"
            title="Chat Directly"
            desc="No external channels needed"
          />
          <FeatureItem
            icon="📊"
            title="Track Costs"
            desc="Monitor usage per agent"
          />
          <FeatureItem
            icon="🔒"
            title="Secure"
            desc="Your keys, encrypted locally"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleCreateFirstAgent}>
          <Text style={styles.buttonText}>Deploy Your First Agent</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function FeatureItem({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <View style={styles.featureItem}>
      <Text style={styles.featureIcon}>{icon}</Text>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDesc}>{desc}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
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
    lineHeight: 24,
    marginTop: 12,
  },
  features: {
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  featureIcon: {
    fontSize: 32,
    width: 48,
    textAlign: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 14,
    color: '#8E8E93',
  },
  button: {
    backgroundColor: '#FFF',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
  },
});
