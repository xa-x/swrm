import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useAgents } from '../../lib/hooks';

export default function BroadcastScreen() {
  const { userId } = useAuth();
  const agents = useAgents(userId);
  
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Map<string, { status: 'pending' | 'sent' | 'error'; response?: string }>>(new Map());

  useEffect(() => {
    // Select all running agents by default
    if (agents) {
      const running = agents
        .filter((a: any) => a.status === 'running')
        .map((a: any) => a._id);
      setSelectedAgents(new Set(running));
    }
  }, [agents]);

  const toggleAgent = (id: string) => {
    const next = new Set(selectedAgents);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedAgents(next);
  };

  const selectAll = () => {
    if (agents) {
      setSelectedAgents(new Set(agents.map((a: any) => a._id)));
    }
  };

  const selectRunning = () => {
    if (agents) {
      const running = agents
        .filter((a: any) => a.status === 'running')
        .map((a: any) => a._id);
      setSelectedAgents(new Set(running));
    }
  };

  const sendBroadcast = async () => {
    if (!message.trim() || selectedAgents.size === 0) return;

    setSending(true);
    setResults(new Map());

    const agentIds = Array.from(selectedAgents);
    
    // Initialize all as pending
    const initial = new Map<string, { status: 'pending' | 'sent' | 'error'; response?: string }>();
    agentIds.forEach(id => initial.set(id, { status: 'pending' }));
    setResults(initial);

    // TODO: Call Convex action to broadcast
    // For now, simulate
    for (const agentId of agentIds) {
      await new Promise(resolve => setTimeout(resolve, 500));
      setResults(prev => {
        const next = new Map(prev);
        next.set(agentId, { status: 'sent', response: 'Response from agent...' });
        return next;
      });
    }

    setSending(false);
  };

  const getAgentById = (id: string) => agents?.find((a: any) => a._id === id);

  if (!agents) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Broadcast</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Message Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Message</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter a command to send to all selected agents..."
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Agent Selection */}
        <View style={styles.section}>
          <View style={styles.selectionHeader}>
            <Text style={styles.label}>Recipients ({selectedAgents.size})</Text>
            <View style={styles.selectionActions}>
              <TouchableOpacity onPress={selectRunning}>
                <Text style={styles.selectionAction}>Running</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectionAction}>All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {agents.map((agent: any) => {
            const isSelected = selectedAgents.has(agent._id);
            const result = results.get(agent._id);

            return (
              <TouchableOpacity
                key={agent._id}
                style={[styles.agentRow, isSelected && styles.agentRowSelected]}
                onPress={() => toggleAgent(agent._id)}
                disabled={sending}
              >
                <Text style={styles.agentIcon}>{agent.icon || '🤖'}</Text>
                <View style={styles.agentInfo}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentMeta}>{agent.status}</Text>
                </View>

                {result && (
                  <View style={styles.resultBadge}>
                    {result.status === 'pending' && (
                      <Ionicons name="hourglass" size={16} color="#8E8E93" />
                    )}
                    {result.status === 'sent' && (
                      <Ionicons name="checkmark-circle" size={16} color="#34C759" />
                    )}
                    {result.status === 'error' && (
                      <Ionicons name="alert-circle" size={16} color="#FF3B30" />
                    )}
                  </View>
                )}

                {!result && (
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Results */}
        {results.size > 0 && (
          <View style={styles.section}>
            <Text style={styles.label}>Responses</Text>
            {Array.from(results.entries()).map(([agentId, result]) => {
              const agent = getAgentById(agentId);
              if (!agent || !result.response) return null;

              return (
                <View key={agentId} style={styles.responseCard}>
                  <Text style={styles.responseAgent}>{agent.name}</Text>
                  <Text style={styles.responseText} numberOfLines={3}>
                    {result.response}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Send Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || selectedAgents.size === 0 || sending) && styles.sendButtonDisabled,
          ]}
          onPress={sendBroadcast}
          disabled={!message.trim() || selectedAgents.size === 0 || sending}
        >
          {sending ? (
            <Text style={styles.sendButtonText}>Sending...</Text>
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFF" />
              <Text style={styles.sendButtonText}>
                Send to {selectedAgents.size} agent{selectedAgents.size !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  messageInput: {
    fontSize: 16,
    color: '#000',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  selectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectionActions: {
    flexDirection: 'row',
    gap: 16,
  },
  selectionAction: {
    fontSize: 14,
    color: '#007AFF',
  },
  agentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    gap: 12,
  },
  agentRowSelected: {
    backgroundColor: '#F0F8FF',
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  agentIcon: {
    fontSize: 28,
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  agentMeta: {
    fontSize: 13,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  resultBadge: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  responseCard: {
    backgroundColor: '#F2F2F7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  responseAgent: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  responseText: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
