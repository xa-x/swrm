import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useAgent, useAgentActions, useUsageByAgent, useStartAgent, useStopAgent, useRestartAgent, Agent } from '@/lib/hooks';
import { Ionicons } from '@expo/vector-icons';
import { Id } from '@/convex/_generated/dataModel';

export default function AgentHomeScreen() {
    const { id: agentIdStr } = useLocalSearchParams<{ id: string }>();
    const agentId = agentIdStr ? (agentIdStr as Id<"agents">) : null;

    // Convex hooks
    const agent = useAgent(agentId);
    const actions = useAgentActions(agentId, 20);
    const usage = useUsageByAgent(agentId, 'month');

    // Mutations
    const startAgent = useStartAgent();
    const stopAgent = useStopAgent();
    const restartAgent = useRestartAgent();

    const handleStart = async () => {
        if (!agentId) return;
        try {
            await startAgent({ agentId });
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleStop = async () => {
        if (!agentId) return;
        try {
            await stopAgent({ agentId });
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    const handleRestart = async () => {
        if (!agentId) return;
        try {
            await restartAgent({ agentId });
        } catch (err: any) {
            Alert.alert('Error', err.message);
        }
    };

    if (!agent) {
        return null;
    }

    const statusColors = {
        creating: '#FF9500',
        running: '#34C759',
        idle: '#FFCC00',
        stopped: '#8E8E93',
        error: '#FF3B30',
    };
    const statusColorValue = statusColors[agent.status as keyof typeof statusColors] ?? '#8E8E93';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <ScrollView style={styles.content}>
                {/* Agent Info */}
                <View style={styles.section}>
                    <View style={styles.agentInfo}>
                        <Text style={styles.agentIcon}>{agent.icon || '🤖'}</Text>
                        <View style={styles.agentDetails}>
                            <Text style={styles.agentName}>{agent.name}</Text>
                            <View style={styles.statusRow}>
                                 <View style={[styles.statusDot, { backgroundColor: statusColorValue as any }]} />
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

                        <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
                            <Ionicons name="refresh" size={20} color="#007AFF" />
                            <Text style={styles.restartButtonText}>Restart</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Pairing / ZeroClaw Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ZeroClaw Pairing</Text>
                    <View style={styles.pairingRow}>
                        <Text style={styles.pairingLabel}>Status</Text>
                        <Text style={[styles.pairingValue, { color: agent.pairingToken ? '#34C759' : '#FF9500' }]}>
                            {agent.pairingToken ? 'Paired' : 'Not Paired'}
                        </Text>
                    </View>
                    {agent.pairingCode && (
                        <View style={styles.pairingRow}>
                            <Text style={styles.pairingLabel}>Pairing Code</Text>
                            <Text style={styles.pairingCodeText}>{agent.pairingCode}</Text>
                        </View>
                    )}
                    {!agent.pairingToken && (
                        <Text style={styles.pairingHelp}>
                            Use this code to pair your native client with this agent.
                        </Text>
                    )}
                </View>

                {/* Usage */}
                {usage && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>This Month</Text>
                        <View style={styles.usageRow}>
                            <Text style={styles.usageLabel}>Cost</Text>
                            <Text style={styles.usageValue}>
                                ${usage.summary.totalCost.toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.usageRow}>
                            <Text style={styles.usageLabel}>Sessions</Text>
                            <Text style={styles.usageValue}>{usage.summary.sessionCount}</Text>
                        </View>
                        <View style={styles.usageRow}>
                            <Text style={styles.usageLabel}>Tokens</Text>
                            <Text style={styles.usageValue}>
                                {((usage.summary.totalInputTokens + usage.summary.totalOutputTokens) / 1000).toFixed(1)}K
                            </Text>
                        </View>
                    </View>
                )}

                {/* Skills */}
                 <View style={styles.section}>
                     <Text style={styles.sectionTitle}>Skills</Text>
                     <View style={styles.skills}>
                         {agent.skills?.map((skill: string) => (
                             <View key={skill} style={styles.skillChip}>
                                 <Text style={styles.skillChipText}>{skill}</Text>
                             </View>
                         )) || (
                             <Text style={{ color: '#8E8E93', textAlign: 'center', padding: 16 }}>
                                 No skills added
                             </Text>
                         )}
                     </View>
                 </View>

                {/* Recent Actions */}
                {actions && actions.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Recent Actions</Text>
                        {actions.slice(0, 5).map((action: any) => (
                            <View key={action._id} style={styles.actionRow}>
                                <Text style={styles.actionName}>{action.action}</Text>
                                <Text style={styles.actionTime}>
                                    {new Date(action.createdAt).toLocaleDateString()}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
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
        flexWrap: 'wrap',
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#34C759',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 100,
    },
    startButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    stopButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FF3B30',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 100,
    },
    stopButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
    },
    restartButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        minWidth: 100,
    },
    restartButtonText: {
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
    pairingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    pairingLabel: {
        fontSize: 16,
        color: '#8E8E93',
    },
    pairingValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    pairingCodeText: {
        fontSize: 24,
        fontWeight: '700',
        letterSpacing: 4,
        color: '#007AFF',
    },
    pairingHelp: {
        fontSize: 14,
        color: '#8E8E93',
        marginTop: 8,
        textAlign: 'center',
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
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7',
    },
    actionName: {
        fontSize: 14,
        color: '#000',
        textTransform: 'capitalize',
    },
    actionTime: {
        fontSize: 14,
        color: '#8E8E93',
    },
});
