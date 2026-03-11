import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { agentsDb, LocalAgent, AgentStatus } from '../../lib/db';
import { api } from '../../lib/api';

export default function AgentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [agent, setAgent] = useState<LocalAgent | null>(null);
  const [usage, setUsage] = useState({ totalCost: 0, sessionCount: 0 });

  useEffect(() => {
    loadAgent();
    loadUsage();
  }, [id]);

  const loadAgent = async () => {
    if (!id) return;
    const data = await agentsDb.getById(id);
    setAgent(data);

    // Sync with server
    try {
      const { agent: serverAgent } = await api.getAgent(id);
      if (serverAgent) {
        await agentsDb.upsert({
          id: serverAgent.id,
          name: serverAgent.name,
          provider: serverAgent.provider,
          model: serverAgent.model,
          personality: serverAgent.personality,
          skills: serverAgent.skills,
          status: serverAgent.status,
        });
        const updated = await agentsDb.getById(id);
        setAgent(updated);
      }
    } catch (err) {
      console.error('Failed to sync agent:', err);
    }
  };

  const loadUsage = async () => {
    if (!id) return;
    try {
      const { summary } = await api.getUsage(id);
      setUsage({
        totalCost: summary.totalCost,
        sessionCount: summary.sessionCount,
      });
    } catch (err) {
      console.error('Failed to load usage:', err);
    }
  };

  const handleStart = async () => {
    if (!id) return;
    try {
      await api.startAgent(id);
      await agentsDb.updateStatus(id, 'running');
      loadAgent();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleStop = async () => {
    if (!id) return;
    try {
      await api.stopAgent(id);
      await agentsDb.updateStatus(id, 'stopped');
      loadAgent();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Agent',
      `Are you sure you want to delete ${agent?.name}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            try {
              await api.deleteAgent(id);
              await agentsDb.delete(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  if (!agent) {
    return null;
  }

  const statusColor = {
    creating: '#FF9500',
    running: '#34C759',
    idle: '#FFCC00',
    stopped: '#8E8E93',
    error: '#FF3B30',
  }[agent.status];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agent Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content}>
        {/* Agent Info */}
        <View style={styles.section}>
          <View style={styles.agentInfo}>
            <Text style={styles.agentIcon}>{agent.icon}</Text>
            <View style={styles.agentDetails}>
              <Text style={styles.agentName}>{agent.name}</Text>
              <View style={styles.statusRow}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={styles.statusText}>{agent.status}</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {agent.status === 'running' ? (
              <TouchableOpacity style={styles.stopButton} onPress={handleStop}>
                <Ionicons name="stop" size={20} color="#FFF" />
                <Text style={styles.stopButtonText}>Stop</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.startButton} onPress={handleStart}>
                <Ionicons name="play" size={20} color="#FFF" />
                <Text style={styles.startButtonText}>Start</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.chatButton} onPress={() => router.push(`/chat/${id}`)}>
              <Ionicons name="chatbubble" size={20} color="#007AFF" />
              <Text style={styles.chatButtonText}>Chat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Usage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Month</Text>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Cost</Text>
            <Text style={styles.usageValue}>${usage.totalCost.toFixed(2)}</Text>
          </View>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Sessions</Text>
            <Text style={styles.usageValue}>{usage.sessionCount}</Text>
          </View>
        </View>

        {/* Configuration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configuration</Text>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Provider</Text>
            <Text style={styles.configValue}>{agent.provider}</Text>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Model</Text>
            <Text style={styles.configValue}>{agent.model || 'default'}</Text>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Personality</Text>
            <Text style={styles.configValue}>{agent.personality}</Text>
          </View>

          <View style={styles.configRow}>
            <Text style={styles.configLabel}>Region</Text>
            <Text style={styles.configValue}>{agent.region}</Text>
          </View>
        </View>

        {/* Skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skills}>
            {JSON.parse(agent.skills as any).map((skill: string) => (
              <View key={skill} style={styles.skillChip}>
                <Text style={styles.skillChipText}>{skill}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
            <Ionicons name="trash" size={20} color="#FF3B30" />
            <Text style={styles.deleteButtonText}>Delete Agent</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  backButton: {
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
    padding: 16,
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  agentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  agentIcon: {
    fontSize: 48,
  },
  agentDetails: {
    flex: 1,
  },
  agentName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 12,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  stopButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 12,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 12,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  usageLabel: {
    fontSize: 16,
    color: '#000',
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  configLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  configValue: {
    fontSize: 16,
    color: '#000',
    textTransform: 'capitalize',
  },
  skills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  skillChip: {
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  skillChipText: {
    fontSize: 14,
    color: '#000',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  deleteButtonText: {
    fontSize: 16,
    color: '#FF3B30',
  },
});
