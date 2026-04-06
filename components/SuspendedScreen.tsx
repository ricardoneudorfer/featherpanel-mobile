import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface SuspendedScreenProps {
  onBack: () => void;
}

export function SuspendedScreen({ onBack }: SuspendedScreenProps) {
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.centerContainer}>
        <View style={styles.suspendedCard}>
          <ShieldAlert size={48} color={Colors.dark.danger} />
          <Text style={styles.suspendedTitle}>Server Suspended</Text>
          <Text style={styles.suspendedSubtitle}>
            This server has been suspended and is currently inaccessible.
            Please contact support if you believe this is a mistake.
          </Text>
          <TouchableOpacity style={styles.suspendedBackButton} onPress={onBack}>
            <Text style={styles.suspendedBackButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  suspendedCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.danger + '40',
    gap: 16,
    maxWidth: 360,
    width: '100%',
  },
  suspendedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.dark.danger,
    textAlign: 'center',
  },
  suspendedSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  suspendedBackButton: {
    marginTop: 8,
    backgroundColor: Colors.dark.bgSecondary,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  suspendedBackButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
});