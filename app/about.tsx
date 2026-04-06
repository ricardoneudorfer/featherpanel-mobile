import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { Globe, Github, MessageCircle, ExternalLink, ArrowLeft, Code, Shield } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';

export default function AboutScreen() {
  const router = useRouter();

  const openLink = async (url: string) => {
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (error) {
      console.error('Failed to open link:', error);
    }
  };

  const links = [
    {
      title: 'FeatherPanel Website',
      url: 'https://featherpanel.com',
      icon: Globe,
      description: 'Official FeatherPanel website',
    },
    {
      title: 'GitHub Repository',
      url: 'https://github.com/mythicalltd/featherpanel',
      icon: Github,
      description: 'View source code and contribute',
    },
    {
      title: 'Discord Community',
      url: 'https://discord.mythical.systems/',
      icon: MessageCircle,
      description: 'Join the community and get support',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          testID="back-button"
        >
          <ArrowLeft size={24} color={Colors.dark.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.logoSection}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.appName}>FeatherPanel Mobile</Text>
          <Text style={styles.version}>Version 1.0.1</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About FeatherPanel</Text>
          <View style={styles.card}>
            <Text style={styles.description}>
              FeatherPanel is a modern, powerful game server management panel that supports 
              Minecraft servers, Discord bots, and various other applications. Built with 
              scalability and ease of use in mind.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>
          {links.map((link, index) => (
            <TouchableOpacity
              key={index}
              style={styles.linkCard}
              onPress={() => openLink(link.url)}
            >
              <View style={styles.linkIcon}>
                <link.icon size={24} color={Colors.dark.primary} />
              </View>
              <View style={styles.linkContent}>
                <Text style={styles.linkTitle}>{link.title}</Text>
                <Text style={styles.linkDescription}>{link.description}</Text>
              </View>
              <ExternalLink size={20} color={Colors.dark.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Credits</Text>

          <View style={styles.creditCard}>
            <View style={styles.creditHeader}>
              <Shield size={20} color={Colors.dark.primary} />
              <Text style={styles.creditTitle}>FeatherPanel</Text>
            </View>
            <Text style={styles.creditText}>
              Official FeatherPanel platform is maintained by its respective team. 
              This mobile app is developed independently for the FeatherPanel platform.
            </Text>
          </View>

          <View style={styles.creditCard}>
            <View style={styles.creditHeader}>
              <Code size={20} color={Colors.dark.accent} />
              <Text style={styles.creditTitle}>Mobile App</Text>
            </View>
            <Text style={styles.creditText}>
              FeatherPanel Mobile is developed, published, and operated by 
              Ricardo Neudorfer. This app is created for FeatherPanel users 
              and is not affiliated with any other organization.
            </Text>
          </View>
        </View>

        <View style={styles.disclaimerSection}>
          <Text style={styles.disclaimerText}>
            FeatherPanel is a trademark of the MythicalSystems Studios project. 
            This mobile app is an independent client developed by Ricardo Neudorfer 
            and is not associated with any other entities.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © {new Date().getFullYear()} Ricardo Neudorfer
          </Text>
          <Text style={styles.footerSubtext}>
            Independent FeatherPanel mobile client
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.dark.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  scrollContent: {
    padding: 16,
  },
  logoSection: {
    alignItems: 'center' as const,
    paddingVertical: 32,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.textMuted,
    textTransform: 'uppercase' as const,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  description: {
    fontSize: 15,
    color: Colors.dark.textSecondary,
    lineHeight: 22,
  },
  linkCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  linkIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgTertiary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  linkContent: {
    flex: 1,
  },
  linkTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  linkDescription: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  creditCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  creditHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 8,
    gap: 8,
  },
  creditTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  creditText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
  },
  disclaimerSection: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  disclaimerText: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    lineHeight: 20,
    textAlign: 'center' as const,
  },
  footer: {
    alignItems: 'center' as const,
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    marginBottom: 4,
  },
  footerSubtext: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
});