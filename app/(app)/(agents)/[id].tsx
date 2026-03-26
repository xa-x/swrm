import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { trpc } from '../../../lib/trpc';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function AgentChatScreen() {
  const { id: agentId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText,
 setInputText] = useState('');
  const [isTyping,
 setIsTyping] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const { data: agent } = trpc.agents.byId.useQuery(
    { id: agentId! },
    { enabled: !!agentId }
  );

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (!inputText.trim() || !agentId || isTyping) return;

    const text = inputText.trim();
    setInputText('');

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // TODO: Call agent API endpoint
      // For now, simulate response
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Add assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a placeholder response. Connect your agent API to send messages.',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send message');
    } finally {
      setIsTyping(false);
    }
  };

  if (agent === undefined) {
    return (
      <View style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  if (!agent) {
    return (
      <View style={styles.container}>
        <View style={styles.error}>
          <Text style={styles.errorTitle}>Agent not found</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (agent.status !== 'running') {
    return (
      <View style={styles.container}>
        <View style={styles.error}>
          <Ionicons name="stop-circle" size={48} color="#8E8E93" />
          <Text style={styles.errorTitle}>{agent.name} is sleeping</Text>
          <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
            <Text style={styles.errorButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{agent.name}</Text>
          <View style={styles.headerStatus}>
            <View style={[styles.statusDot, { backgroundColor: '#34C759' }]} />
            <Text style={styles.headerStatusText}>
              {isTyping ? 'Thinking...' : 'Running'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => router.push(`/settings/agent/${agentId}`)}
        >
          <Ionicons name="ellipsis-horizontal" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={scrollToBottom}
        >
          {/* Privacy Notice */}
          {messages.length === 0 && (
            <View style={styles.privacyNotice}>
              <Ionicons name="lock-closed" size={16} color="#8E8E93" />
              <Text style={styles.privacyText}>
                Messages are not stored
              </Text>
            </View>
          )}

          {/* Empty State */}
          {messages.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyText}>Send a message to start</Text>
            </View>
          )}

          {/* Messages */}
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.bubble,
                message.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant
              ]}
            >
              <Text style={message.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
                {message.content}
              </Text>
            </View>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#8E8E93"
            multiline
            maxLength={4000}
            editable={!isTyping}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isTyping) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isTyping}
          >
            <Ionicons name="arrow-up" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  error: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12, padding: 40 },
  errorTitle: { fontSize: 20, fontWeight: '600', color: '#000' },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  errorButtonText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  headerStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  headerStatusText: { fontSize: 12, color: '#8E8E93' },
  moreButton: { padding: 8 },
  content: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 24,
  },
  privacyText: { fontSize: 13, color: '#8E8E93' },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#8E8E93' },
  bubble: {
    maxWidth: '85%',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#F2F2F7',
    borderBottomLeftRadius: 4,
  },
  bubbleTextUser: { fontSize: 16, color: '#FFF', lineHeight: 22 },
  bubbleTextAssistant: { fontSize: 16, color: '#000', lineHeight: 22 },
  typingIndicator: {
    alignSelf: 'flex-start',
    padding: 14,
    backgroundColor: '#F2F2F7',
    borderRadius: 18,
  },
  typingText: { fontSize: 14, color: '#8E8E93' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFF',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderRadius: 20,
    color: '#000',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#C7C7CC' },
});
