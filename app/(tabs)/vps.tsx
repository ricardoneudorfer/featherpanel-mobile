import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Cloud, Zap, Database, Shield } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function VpsComingSoon() {
  return (
    <View style={styles.container}>
      <Cloud size={100} color={Colors.dark.primary} style={styles.icon} />
      <Text style={styles.title}>VPS Manager</Text>
      <Text style={styles.subtitle}>Coming Soon!</Text>
      
      <View style={styles.features}>
        <View style={styles.featureRow}>
          <Zap size={24} color={Colors.dark.primary} style={styles.featureIcon} />
          <Text style={styles.featureText}>One-click deployments</Text>
        </View>
        <View style={styles.featureRow}>
          <Database size={24} color={Colors.dark.primary} style={styles.featureIcon} />
          <Text style={styles.featureText}>Resource monitoring</Text>
        </View>
        <View style={styles.featureRow}>
          <Shield size={24} color={Colors.dark.primary} style={styles.featureIcon} />
          <Text style={styles.featureText}>SSH & security tools</Text>
        </View>
      </View>
      
      <Text style={styles.footer}>Stay tuned for powerful VPS controls</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, backgroundColor: Colors.dark.bgSecondary },
  icon: { marginBottom: 30 },
  title: { fontSize: 32, fontWeight: 'bold', color: Colors.dark.text, marginBottom: 10 },
  subtitle: { fontSize: 24, color: Colors.dark.primary, marginBottom: 40 },
  features: { alignItems: 'center', marginBottom: 30 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  featureIcon: { marginRight: 15 },
  featureText: { fontSize: 18, color: Colors.dark.text, fontWeight: '500' },
  footer: { fontSize: 16, color: Colors.dark.textMuted, textAlign: 'center' },
});