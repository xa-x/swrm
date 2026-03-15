import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useConvexAuth, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

type AgentStatus = 'creating' | 'running' | 'stopped' | 'error';

interface Agent {
  _id: string;
  name: string;
  icon?: string;
  provider: string;
  model?: string;
  status: AgentStatus;
}

export default function AgentsListScreen() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  // Real-time subscription to agents
  const agents = useQuery(
    api.agents.list,
    isAuthenticated ? {} : 'skip'
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const openAgent = (agentId: string) => {
    router.push(`/(app)/(agents)/${agentId}`);
  };

  const createAgent = () => {
    router.push('/(app)/create');
  };

  // Loading state
  if (authLoading || (agents === undefined && !refreshing)) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Agents</Text>
        <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {/* Agent List */}
      {agents && agents.length > 0 ? (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {agents.map((agent: Agent) => (
            <TouchableOpacity 
              key={agent._id} 
              style={styles.card} 
              onPress={() => openAgent(agent._id)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardIcon}>{agent.icon || '🤖'}</Text>
              </View>
              
              <View style={styles.cardCenter}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {agent.name}
                </Text>
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {agent.provider} {agent.model ? `• ${agent.model}` : ''}
                </Text>
              </View>

              <View style={styles.cardRight}>
                <View style={[
                  styles.statusDot, 
                  { backgroundColor: agent.status === 'running' ? '#34C759' : '#8E8E93' }
                ]} />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        /* Empty State */
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🤖</Text>
          <Text style={styles.emptyTitle}>No agents yet</Text>
          <Text style={styles.emptyText}>Create your first AI agent</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={createAgent}>
            <Ionicons name="add" size={20} color="#FFF" />
            <Text style={styles.emptyButtonText}>Create Agent</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FAB */}
      {agents && agents.length > 0 && (
        <TouchableOpacity 
          style={[styles.fab, { bottom: insets.bottom + 20 }]} 
          onPress={createAgent}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: '#000',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIcon: {
    fontSize: 24,
  },
  cardCenter: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  cardMeta: {
    fontSize: 14,
    color: '#8E8E93',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
