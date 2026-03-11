import { StyleSheet, View, Text, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';

interface ProgressIndicatorProps {
  status: 'creating' | 'pulling' | 'starting' | 'running' | 'error';
  progress?: number;
  error?: string;
}

export function ProgressIndicator({ status, progress, error }: ProgressIndicatorProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'creating' || status === 'pulling' || status === 'starting') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [status]);

  const statusConfig = {
    creating: {
      icon: '🔨',
      text: 'Creating agent...',
      color: '#FF9500',
    },
    pulling: {
      icon: '📥',
      text: 'Pulling container image...',
      color: '#007AFF',
    },
    starting: {
      icon: '🚀',
      text: 'Starting container...',
      color: '#34C759',
    },
    running: {
      icon: '✅',
      text: 'Agent ready!',
      color: '#34C759',
    },
    error: {
      icon: '❌',
      text: 'Failed to create agent',
      color: '#FF3B30',
    },
  }[status];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.iconContainer, { opacity: pulseAnim }]}>
        <Text style={styles.icon}>{statusConfig.icon}</Text>
      </Animated.View>

      <Text style={[styles.text, { color: statusConfig.color }]}>
        {statusConfig.text}
      </Text>

      {progress !== undefined && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${progress}%`, backgroundColor: statusConfig.color }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={16} color="#FF3B30" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  icon: {
    fontSize: 48,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  progressContainer: {
    marginTop: 16,
    width: '100%',
    maxWidth: 200,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#FF3B30',
  },
});
