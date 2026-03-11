import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ErrorRecoveryProps {
  error: string;
  onRetry: () => void;
  onDismiss: () => void;
}

export function ErrorRecovery({ error, onRetry, onDismiss }: ErrorRecoveryProps) {
  const isNetworkError = error.toLowerCase().includes('network') || 
                         error.toLowerCase().includes('timeout') ||
                         error.toLowerCase().includes('connection');
  
  const isDockerError = error.toLowerCase().includes('docker') ||
                        error.toLowerCase().includes('container');

  const suggestions = {
    network: 'Check your internet connection and try again.',
    docker: 'Make sure Docker Desktop is running.',
    default: 'Something went wrong. Please try again.',
  };

  const suggestion = isNetworkError 
    ? suggestions.network 
    : isDockerError 
      ? suggestions.docker 
      : suggestions.default;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning" size={48} color="#FF9500" />
      </View>

      <Text style={styles.title}>Oops!</Text>
      <Text style={styles.error}>{error}</Text>
      <Text style={styles.suggestion}>{suggestion}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={20} color="#FFF" />
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Text style={styles.dismissText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {isDockerError && (
        <TouchableOpacity style={styles.helpLink}>
          <Ionicons name="help-circle-outline" size={16} color="#007AFF" />
          <Text style={styles.helpText}>How to set up Docker</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  error: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 8,
  },
  suggestion: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  dismissButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  dismissText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  helpLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
  },
  helpText: {
    fontSize: 14,
    color: '#007AFF',
  },
});
