/**
 * Create Agent Screen
 * 
 * 2 fields: Name + API Key
 * Auto-detects provider
 */

import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';

// Auto-detect provider from API key
function detectProvider(apiKey: string): { provider: string; model: string; name: string } {
  if (apiKey.startsWith('sk-proj-') || (apiKey.startsWith('sk-') && apiKey.length >= 48)) {
    return { provider: 'openai', model: 'gpt-4o-mini', name: 'OpenAI' };
  }
  if (apiKey.startsWith('sk-ant-')) {
    return { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', name: 'Anthropic' };
  }
  if (apiKey.startsWith('sk-or-')) {
    return { provider: 'openrouter', model: 'openrouter/auto', name: 'OpenRouter' };
  }
  if (apiKey.startsWith('AIza')) {
    return { provider: 'google', model: 'gemini-1.5-flash', name: 'Google AI' };
  }
  return { provider: 'openai', model: 'gpt-4o-mini', name: 'OpenAI' };
}

export default function CreateAgentScreen() {
  const insets = useSafeAreaInsets();
  const createAgent = useMutation(api.agents.create);

  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const detected = detectProvider(apiKey);
  const isValid = name.trim().length > 0 && apiKey.trim().length > 0;

  const handleCreate = async () => {
    if (!isValid) return;

    setIsCreating(true);

    try {
      await createAgent({
        name: name.trim(),
        systemPrompt: instructions.trim() || `You are ${name}, a helpful AI assistant.`,
        provider: detected.provider,
        model: detected.model,
        apiKey: apiKey.trim(),
      });

      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create agent');
    } finally {
      setIsCreating(false);
    }
  };

  if (isCreating) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Spawning your agent...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Agent</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
        <View style={styles.field}>
          <Text style={styles.label}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="My Assistant"
            placeholderTextColor="#C7C7CC"
            value={name}
            onChangeText={setName}
            maxLength={50}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Instructions (optional)</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="What should this agent do?"
            placeholderTextColor="#C7C7CC"
            value={instructions}
            onChangeText={setInstructions}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>API Key *</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-..."
            placeholderTextColor="#C7C7CC"
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            autoCapitalize="none"
          />
          
          {apiKey.length > 0 && (
            <View style={styles.detected}>
              <Ionicons name="checkmark-circle" size={16} color="#34C759" />
              <Text style={styles.detectedText}>
                {detected.name} ({detected.model})
              </Text>
            </View>
          )}
        </View>

        <View style={styles.info}>
          <Ionicons name="information-circle" size={20} color="#007AFF" />
          <Text style={styles.infoText}>
            Your API key is encrypted. We never store messages.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
        <TouchableOpacity
          style={[styles.button, !isValid && styles.buttonDisabled]}
          onPress={handleCreate}
          disabled={!isValid}
        >
          <Text style={[styles.buttonText, !isValid && styles.buttonTextDisabled]}>
            Create Agent
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  cancelText: { fontSize: 17, color: '#007AFF' },
  form: { flex: 1 },
  formContent: { paddingHorizontal: 20, paddingBottom: 20, gap: 20 },
  field: { gap: 8 },
  label: { fontSize: 15, fontWeight: '600', color: '#000' },
  input: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#000',
  },
  textarea: { minHeight: 80 },
  detected: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  detectedText: { fontSize: 14, color: '#34C759' },
  info: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#E8F4FD',
    borderRadius: 12,
    padding: 16,
  },
  infoText: { flex: 1, fontSize: 14, color: '#007AFF' },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFF',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#E5E5EA' },
  buttonText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  buttonTextDisabled: { color: '#C7C7CC' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 18, fontWeight: '600', color: '#000' },
});
