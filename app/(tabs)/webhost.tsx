import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Globe, Database, Lock, Download } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function WebhostComingSoon() {
  return (
    <View style={styles.container}>
      <Globe size={100} color={Colors.dark.primary} style={styles.icon} />
      <Text style={styles.title}>Web Hosting</Text>
      <Text style={styles.subtitle}>Coming Soon!</Text>
      
      <View style={styles.features}>
        <View style={styles.featureRow}>
          <Globe size={24} color={Colors.dark.primary} style={styles.featureIcon} />
          <Text style={styles.featureText}>Domain Management</Text>
        </View>
        <View style={styles.featureRow}>
          <Database size={24} color={Colors.dark.primary} style={styles.featureIcon} />
          <Text style={styles.featureText}>Database management</Text>
        </View>
        <View style={styles.featureRow}>
          <Lock size={24} color={Colors.dark.primary} style={styles.featureIcon} />
          <Text style={styles.featureText}>SSL certificates</Text>
        </View>
      </View>
      
      <Text style={styles.footer}>Complete website hosting solution coming soon</Text>
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