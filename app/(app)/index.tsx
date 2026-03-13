import { StyleSheet, View, Text, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useConvexAuth } from 'convex/react';
import { useAgents, useAuthTest } from '@/lib/hooks';
import { agentsDb, LocalAgent, AgentStatus } from '@/lib/db';

export default function HomeScreen() {
  const { userId } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const [localAgents, setLocalAgents] = useState<LocalAgent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  // Backend Auth Test
  const authTestResult = useAuthTest();
  useEffect(() => {
    if (authTestResult !== undefined) {
      console.log('--- CONVEX BACKEND AUTH TEST ---');
      console.log('Is Authenticated?', !!authTestResult);
      console.log('Identity:', JSON.stringify(authTestResult, null, 2));
    }
  }, [authTestResult]);

  // Real-time subscription to agents
  const agents = useAgents(isAuthenticated && userId ? userId : null);

  // Load local cache
  useEffect(() => {
    loadLocalAgents();
  }, []);

  // Sync Convex data to local DB
  useEffect(() => {
    if (agents) {
      syncToLocal(agents);
    }
  }, [agents]);

  const loadLocalAgents = async () => {
    const local = await agentsDb.getAll();
    setLocalAgents(local);
  };

  const syncToLocal = async (serverAgents: any[]) => {
    for (const agent of serverAgents) {
      await agentsDb.upsert({
        id: agent._id,
        name: agent.name,
        icon: agent.icon,
        provider: agent.provider,
        model: agent.model,
        personality: agent.personality,
        skills: agent.skills,
        status: agent.status,
        region: agent.region,
      });
    }
    loadLocalAgents();
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Convex automatically refreshes, just update local
    loadLocalAgents().then(() => setRefreshing(false));
  }, []);

  const openChat = (agentId: string) => {
    router.push(`/chat/${agentId}`);
  };

  const createAgent = () => {
    router.push('/create');
  };

  // Loading state
  if (agents === undefined && localAgents.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" />
          <Text> Loading state  </Text>
        </View>
      </View>
    );
  }

  // Use server data if available, else local cache
  const displayAgents = agents || localAgents;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Swrm</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/broadcast')}>
            <Ionicons name="megaphone-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Agent Grid */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {displayAgents.map((agent: any) => (
          <AgentCard key={agent._id || agent.id} agent={agent} onPress={() => openChat(agent._id || agent.id)} />
        ))}

        {/* Add Agent Card */}
        <TouchableOpacity style={styles.addCard} onPress={createAgent}>
          <Ionicons name="add" size={32} color="#8E8E93" />
          <Text style={styles.addText}>New Agent</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Empty State */}
      {displayAgents.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="rocket-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyTitle}>No agents yet</Text>
          <Text style={styles.emptyText}>Create your first AI agent to get started</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={createAgent}>
            <Text style={styles.emptyButtonText}>Create Agent</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function AgentCard({ agent, onPress }: { agent: any; onPress: () => void }) {
  const status = agent.status as AgentStatus;

  const statusColor = {
    creating: '#FF9500',
    running: '#34C759',
    idle: '#FFCC00',
    stopped: '#8E8E93',
    error: '#FF3B30',
  }[status];

  const statusIcon = {
    creating: 'sync',
    running: 'radio-button-on',
    idle: 'pause-circle',
    stopped: 'stop-circle',
    error: 'alert-circle',
  }[status] as keyof typeof Ionicons.glyphMap;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardIcon}>{agent.icon || '🤖'}</Text>
        <View style={styles.cardStatus}>
          <Ionicons name={statusIcon} size={12} color={statusColor} />
        </View>
      </View>

      <Text style={styles.cardName} numberOfLines={1}>
        {agent.name}
      </Text>

      <Text style={styles.cardMeta} numberOfLines={1}>
        {agent.provider} • {agent.model || 'default'}
      </Text>

      <View style={styles.cardFooter}>
        <Text style={styles.cardCost}>${(agent.monthlyCost || 0).toFixed(2)}</Text>
        <Text style={styles.cardPeriod}>this month</Text>
      </View>

      {status === 'running' && (
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>Active</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const CARD_SIZE = 160;
const GAP = 12;

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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    paddingBottom: 100,
  },
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardIcon: {
    fontSize: 28,
  },
  cardStatus: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginTop: 12,
  },
  cardMeta: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 4,
  },
  cardFooter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  cardCost: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  cardPeriod: {
    fontSize: 11,
    color: '#8E8E93',
  },
  cardBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#34C759',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cardBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFF',
  },
  addCard: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: '#FFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  emptyButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
});
