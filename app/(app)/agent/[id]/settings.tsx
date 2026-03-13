import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { useAgent, useDeleteAgent } from '@/lib/hooks';
import { Ionicons } from '@expo/vector-icons';

export default function AgentSettingsTab() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const agent = useAgent(id as any);
    const deleteAgent = useDeleteAgent();

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
                        try {
                            await deleteAgent({ agentId: id as any });
                            router.replace('/');
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

    return (
        <SafeAreaView style={styles.container} edges={[]}>
            <ScrollView style={styles.content}>
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
                        <Text style={styles.configValue}>{agent.region || 'auto'}</Text>
                    </View>
                </View>

                {/* Danger Zone */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: '#FF3B30' }]}>Danger Zone</Text>
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
        fontWeight: '600',
    },
});
