import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useCreateAgent } from '../../lib/hooks';
import { secureStorage } from '../../lib/storage';
import { ProgressIndicator } from '../../components/ProgressIndicator';
import { ErrorRecovery } from '../../components/ErrorRecovery';

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', icon: '🔮', models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'anthropic', name: 'Anthropic', icon: '🧠', models: ['claude-sonnet-4', 'claude-3-5-sonnet', 'claude-3-haiku'] },
  { id: 'openrouter', name: 'OpenRouter', icon: '🔀', models: ['openrouter/auto', 'anthropic/claude-sonnet-4', 'openai/gpt-4o'] },
  { id: 'zhipu', name: 'Zhipu (GLM)', icon: '🇨🇳', models: ['glm-4', 'glm-4-plus', 'glm-3-turbo'] },
  { id: 'ollama', name: 'Ollama (Local)', icon: '🦙', models: ['llama3.2', 'llama3.1', 'qwen2.5'] },
];

const PERSONALITIES = [
  { id: 'professional', name: 'Professional', desc: 'Thorough, accurate, formal' },
  { id: 'friendly', name: 'Friendly', desc: 'Warm, approachable, conversational' },
  { id: 'concise', name: 'Direct', desc: 'Brief, to the point, no fluff' },
  { id: 'creative', name: 'Creative', desc: 'Think outside the box' },
];

const SKILLS = [
  { id: 'code', name: 'Code Execution', icon: '💻' },
  { id: 'web', name: 'Web Search', icon: '🌐' },
  { id: 'files', name: 'File Management', icon: '📁' },
  { id: 'email', name: 'Email', icon: '📧' },
  { id: 'calendar', name: 'Calendar', icon: '📅' },
  { id: 'notes', name: 'Notes', icon: '📝' },
];

export default function CreateAgentScreen() {
  const { userId } = useAuth();
  const createAgent = useCreateAgent();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [personality, setPersonality] = useState('friendly');
  const [skills, setSkills] = useState<string[]>([]);
  
  // Creation state
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<'creating' | 'pulling' | 'starting' | 'running' | 'error'>('creating');
  const [createProgress, setCreateProgress] = useState(0);
  const [createError, setCreateError] = useState<string | null>(null);

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim().length > 0;
      case 1: return provider.length > 0 && apiKey.trim().length > 0;
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      handleCreateAgent();
    }
  };

  const toggleSkill = (skillId: string) => {
    setSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(s => s !== skillId)
        : [...prev, skillId]
    );
  };

  const handleCreateAgent = async () => {
    if (!userId) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    setIsCreating(true);
    setCreateStatus('creating');
    setCreateProgress(20);
    setCreateError(null);

    try {
      // Save API key securely
      await secureStorage.saveApiKey(provider, apiKey);
      await secureStorage.trackProvider(provider);

      setCreateProgress(40);

      // Create agent via Convex mutation
      const result = await createAgent({
        userId,
        name,
        provider: provider as any,
        apiKey,
        model: model || undefined,
        personality: personality as any,
        skills,
      });

      setCreateStatus('pulling');
      setCreateProgress(60);

      // Poll for status updates
      // Convex will update the agent status in real-time
      // For now, simulate progress
      setTimeout(() => {
        setCreateStatus('starting');
        setCreateProgress(80);
      }, 2000);

      setTimeout(() => {
        setCreateStatus('running');
        setCreateProgress(100);
        
        // Go back after success
        setTimeout(() => {
          router.back();
        }, 1000);
      }, 4000);

    } catch (err: any) {
      setCreateStatus('error');
      setCreateError(err.message || 'Failed to create agent');
    }
  };

  const handleRetry = () => {
    handleCreateAgent();
  };

  const handleDismiss = () => {
    setIsCreating(false);
    setCreateError(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Progress */}
      <View style={styles.progress}>
        {[0, 1, 2, 3].map(i => (
          <View 
            key={i} 
            style={[
              styles.progressDot, 
              i <= step && styles.progressDotActive,
              i === step && styles.progressDotCurrent,
            ]} 
          />
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Step 0: Name */}
        {step === 0 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Name your agent</Text>
            <Text style={styles.stepDesc}>Give it a name that reflects its purpose</Text>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g., Nova, Atlas, Echo..."
              placeholderTextColor="#8E8E93"
              autoFocus
            />

            <Text style={styles.inputHint}>This is how you'll refer to it in chats</Text>
          </View>
        )}

        {/* Step 1: Provider & API Key */}
        {step === 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Choose a provider</Text>
            <Text style={styles.stepDesc}>Select your AI provider and enter your API key</Text>

            <View style={styles.providers}>
              {PROVIDERS.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.providerCard, provider === p.id && styles.providerCardActive]}
                  onPress={() => {
                    setProvider(p.id);
                    setModel(p.models[0]);
                  }}
                >
                  <Text style={styles.providerIcon}>{p.icon}</Text>
                  <Text style={styles.providerName}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {provider && (
              <>
                <Text style={styles.label}>API Key</Text>
                <TextInput
                  style={styles.input}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder={`Enter your ${selectedProvider?.name} API key`}
                  placeholderTextColor="#8E8E93"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.label}>Model (optional)</Text>
                <View style={styles.models}>
                  {selectedProvider?.models.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.modelChip, model === m && styles.modelChipActive]}
                      onPress={() => setModel(m)}
                    >
                      <Text style={[styles.modelChipText, model === m && styles.modelChipTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* Step 2: Personality */}
        {step === 2 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>How should it behave?</Text>
            <Text style={styles.stepDesc}>Choose a personality style</Text>

            <View style={styles.personalities}>
              {PERSONALITIES.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.personalityCard, personality === p.id && styles.personalityCardActive]}
                  onPress={() => setPersonality(p.id)}
                >
                  <Text style={styles.personalityName}>{p.name}</Text>
                  <Text style={styles.personalityDesc}>{p.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Skills */}
        {step === 3 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>What can it do?</Text>
            <Text style={styles.stepDesc}>Enable capabilities for your agent</Text>

            <View style={styles.skills}>
              {SKILLS.map(s => (
                <TouchableOpacity
                  key={s.id}
                  style={[styles.skillCard, skills.includes(s.id) && styles.skillCardActive]}
                  onPress={() => toggleSkill(s.id)}
                >
                  <Text style={styles.skillIcon}>{s.icon}</Text>
                  <Text style={styles.skillName}>{s.name}</Text>
                  {skills.includes(s.id) && (
                    <Ionicons name="checkmark-circle" size={20} color="#34C759" style={styles.skillCheck} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step > 0 && !isCreating && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
          onPress={nextStep}
          disabled={!canProceed() || isCreating}
        >
          {isCreating ? (
            <Text style={styles.nextButtonText}>Creating...</Text>
          ) : (
            <Text style={styles.nextButtonText}>
              {step === 3 ? 'Create Agent' : 'Next'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Creation Progress Modal */}
      <Modal
        visible={isCreating}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {createStatus !== 'error' ? (
              <ProgressIndicator 
                status={createStatus} 
                progress={createProgress}
              />
            ) : (
              <ErrorRecovery
                error={createError || 'Unknown error'}
                onRetry={handleRetry}
                onDismiss={handleDismiss}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E5EA',
  },
  progressDotActive: {
    backgroundColor: '#007AFF',
  },
  progressDotCurrent: {
    width: 24,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  step: {
    gap: 16,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  stepDesc: {
    fontSize: 16,
    color: '#8E8E93',
  },
  input: {
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    padding: 16,
    color: '#000',
  },
  inputHint: {
    fontSize: 14,
    color: '#8E8E93',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
  },
  providers: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  providerCard: {
    width: '47%',
    aspectRatio: 1.5,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  providerCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  providerIcon: {
    fontSize: 28,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  models: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modelChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  modelChipActive: {
    backgroundColor: '#007AFF',
  },
  modelChipText: {
    fontSize: 14,
    color: '#000',
  },
  modelChipTextActive: {
    color: '#FFF',
  },
  personalities: {
    gap: 12,
  },
  personalityCard: {
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 16,
  },
  personalityCardActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  personalityName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  personalityDesc: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  skills: {
    gap: 12,
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 16,
    gap: 12,
  },
  skillCardActive: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF0',
  },
  skillIcon: {
    fontSize: 24,
  },
  skillName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  skillCheck: {
    marginLeft: 'auto',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 320,
  },
});
