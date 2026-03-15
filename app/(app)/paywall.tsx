/**
 * Paywall Screen — Pay Per Agent Model
 * 
 * Pricing:
 * - $5/agent/month
 * - 1GB storage included (shared)
 * - $2/GB for extra storage
 */

import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useClerk } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export default function PaywallScreen() {
  const insets = useSafeAreaInsets();
  const { openSignIn } = useClerk();
  const user = useQuery(api.users.getUser);
  const agents = useQuery(api.agents.list);
  
  const [loading, setLoading] = useState(false);

  const currentPlan = user?.plan ?? 'free';
  const agentCount = agents?.length ?? 0;
  const monthlyCost = agentCount * 5;
  const storageUsedMb = user?.storageUsedMb ?? 0;
  const storageLimitMb = 1024; // 1GB
  const storageUsedGb = storageUsedMb / 1024;
  const needsMoreStorage = storageUsedMb > storageLimitMb;

   const handleAddPayment = async () => {
     setLoading(true);
     try {
       await openSignIn();
     } catch (error) {
       console.error('Billing error:', error);
     } finally {
       setLoading(false);
     }
   };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Current Usage */}
        <View style={styles.usageCard}>
          <Text style={styles.usageTitle}>Current Usage</Text>
          
          <View style={styles.usageRow}>
            <View style={styles.usageItem}>
              <Ionicons name="people-outline" size={24} color="#007AFF" />
              <Text style={styles.usageValue}>{agentCount}</Text>
              <Text style={styles.usageLabel}>Agents</Text>
            </View>

            <View style={styles.usageDivider} />

            <View style={styles.usageItem}>
              <Ionicons name="cube-outline" size={24} color="#007AFF" />
              <Text style={styles.usageValue}>{storageUsedGb.toFixed(1)} GB</Text>
              <Text style={styles.usageLabel}>Storage</Text>
            </View>
          </View>

          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Monthly Cost</Text>
            <Text style={styles.costValue}>${monthlyCost}/mo</Text>
          </View>
        </View>

        {/* Pricing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pricing</Text>

          <View style={styles.pricingCard}>
            <View style={styles.pricingRow}>
              <Ionicons name="person-add-outline" size={20} color="#34C759" />
              <Text style={styles.pricingText}>Per Agent</Text>
              <Text style={styles.pricingPrice}>$5/mo</Text>
            </View>

            <View style={styles.pricingDivider} />

            <View style={styles.pricingRow}>
              <Ionicons name="gift-outline" size={20} color="#007AFF" />
              <Text style={styles.pricingText}>Storage Included</Text>
              <Text style={styles.pricingPrice}>1 GB</Text>
            </View>

            <View style={styles.pricingDivider} />

            <View style={styles.pricingRow}>
              <Ionicons name="add-circle-outline" size={20} color="#FF9500" />
              <Text style={styles.pricingText}>Extra Storage</Text>
              <Text style={styles.pricingPrice}>$2/GB</Text>
            </View>
          </View>
        </View>

        {/* How It Works */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <View style={styles.howCard}>
            <View style={styles.howStep}>
              <View style={styles.howNumber}>
                <Text style={styles.howNumberText}>1</Text>
              </View>
              <Text style={styles.howText}>Create agents (no payment yet)</Text>
            </View>

            <View style={styles.howStep}>
              <View style={styles.howNumber}>
                <Text style={styles.howNumberText}>2</Text>
              </View>
              <Text style={styles.howText}>Add payment method when ready</Text>
            </View>

            <View style={styles.howStep}>
              <View style={styles.howNumber}>
                <Text style={styles.howNumberText}>3</Text>
              </View>
              <Text style={styles.howText}>Billed monthly per agent</Text>
            </View>

            <View style={styles.howStep}>
              <View style={styles.howNumber}>
                <Text style={styles.howNumberText}>4</Text>
              </View>
              <Text style={styles.howText}>Delete agent = stop paying</Text>
            </View>
          </View>
        </View>

        {/* Storage Warning */}
        {needsMoreStorage && (
          <View style={styles.warning}>
            <Ionicons name="warning-outline" size={20} color="#FF9500" />
            <Text style={styles.warningText}>
              You're using {((storageUsedMb - storageLimitMb) / 1024).toFixed(1)} GB over the free limit.
              Extra charge: ${(((storageUsedMb - storageLimitMb) / 1024) * 2).toFixed(0)}/mo
            </Text>
          </View>
        )}

        {/* Action Button */}
        {currentPlan === 'free' ? (
          <TouchableOpacity
            style={[styles.addButton, loading && styles.addButtonDisabled]}
            onPress={handleAddPayment}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="card-outline" size={20} color="#FFF" />
                <Text style={styles.addButtonText}>Add Payment Method</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.manageButton}
            onPress={handleAddPayment}
          >
            <Ionicons name="settings-outline" size={20} color="#007AFF" />
            <Text style={styles.manageButtonText}>Manage Payment</Text>
          </TouchableOpacity>
        )}

        {/* Info */}
        <View style={styles.info}>
          <Ionicons name="information-circle" size={20} color="#8E8E93" />
          <Text style={styles.infoText}>
            Only pay for what you use. Delete an agent anytime to stop charges.
          </Text>
        </View>
      </ScrollView>
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
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 20, paddingBottom: 40, gap: 20 },
  
  // Usage Card
  usageCard: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  usageTitle: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  usageRow: { flexDirection: 'row', alignItems: 'center' },
  usageItem: { flex: 1, alignItems: 'center', gap: 4 },
  usageValue: { fontSize: 32, fontWeight: '700', color: '#FFF' },
  usageLabel: { fontSize: 13, color: '#FFF', opacity: 0.8 },
  usageDivider: { width: 1, height: 40, backgroundColor: '#FFF', opacity: 0.2 },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#FFF',
    opacity: 0.2,
  },
  costLabel: { fontSize: 15, color: '#FFF', opacity: 0.8 },
  costValue: { fontSize: 24, fontWeight: '700', color: '#FFF' },
  
  // Section
  section: { gap: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '600', color: '#000' },
  
  // Pricing
  pricingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
  },
  pricingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  pricingText: { flex: 1, fontSize: 16, color: '#000' },
  pricingPrice: { fontSize: 16, fontWeight: '600', color: '#000' },
  pricingDivider: { height: 1, backgroundColor: '#E5E5EA', marginVertical: 4 },
  
  // How It Works
  howCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  howStep: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  howNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  howNumberText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  howText: { flex: 1, fontSize: 15, color: '#000' },
  
  // Warning
  warning: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF4E5',
    borderRadius: 12,
    padding: 16,
  },
  warningText: { flex: 1, fontSize: 14, color: '#FF9500' },
  
  // Buttons
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    borderRadius: 14,
    paddingVertical: 16,
  },
  addButtonDisabled: { opacity: 0.5 },
  addButtonText: { fontSize: 17, fontWeight: '600', color: '#FFF' },
  manageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 16,
  },
  manageButtonText: { fontSize: 17, fontWeight: '600', color: '#007AFF' },
  
  // Info
  info: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
  },
  infoText: { flex: 1, fontSize: 14, color: '#8E8E93' },
});
