import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { LogOut, Settings, Info, FileClock, ExternalLink, Shield, Globe, User as UserIcon, Lock, Network, List } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

type ProfileTab = 'overview' | 'security' | 'instance';

export default function ProfileScreen() {
  const {
    user,
    logout,
    clearAll,
    instanceUrl,
    isLogoutLoading,
    fetchSession,
    authToken,
    savedInstances,
  } = useApp();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');

  useEffect(() => {
    if (authToken) {
      fetchSession().catch(() => undefined);
      const interval = setInterval(() => {
        fetchSession().catch(() => undefined);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [authToken, fetchSession]);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              router.replace('/auth');
            } catch {}
          },
        },
      ]
    );
  };

  const handleResetInstance = () => {
    Alert.alert(
      'Reset Instance',
      'This will clear all data including instance URL and login. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            router.replace('/instance-setup');
          },
        },
      ]
    );
  };

  const initials =
    (user?.first_name?.[0] || '').toUpperCase() +
    (user?.last_name?.[0] || '').toUpperCase();

  const statusLabel = (value?: string | boolean) => {
    if (value === true || value === 'true') return 'Yes';
    if (value === false || value === 'false') return 'No';
    return 'Unknown';
  };

  const renderOverviewTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>User ID</Text>
            <Text style={styles.cardValue}>{user?.id ?? '-'}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Username</Text>
            <Text style={styles.cardValue}>{user?.username || '-'}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Role</Text>
            <Text style={styles.cardValue}>{user?.role?.display_name || user?.role?.name || 'User'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.card}>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>First seen</Text>
            <Text style={styles.cardValueSmall}>{user?.first_seen || '-'}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Last seen</Text>
            <Text style={styles.cardValueSmall}>{user?.last_seen || '-'}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>First IP</Text>
            <Text style={styles.cardValueMonospace}>{user?.first_ip || '-'}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Last IP</Text>
            <Text style={styles.cardValueMonospace}>{user?.last_ip || '-'}</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderSecurityTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security status</Text>
        <View style={styles.card}>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Two-factor enabled</Text>
            <Text style={styles.cardValue}>{statusLabel(user?.two_fa_enabled)}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Two-factor blocked</Text>
            <Text style={styles.cardValue}>{statusLabel(user?.two_fa_blocked)}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Banned</Text>
            <Text style={styles.cardValue}>{statusLabel(user?.banned)}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Locked</Text>
            <Text style={styles.cardValue}>{statusLabel(user?.locked)}</Text>
          </View>
          <View style={styles.cardRowLine}>
            <Text style={styles.cardLabel}>Deleted</Text>
            <Text style={styles.cardValue}>{statusLabel(user?.deleted)}</Text>
          </View>
        </View>
      </View>
    </>
  );

  const renderInstanceTab = () => (
    <>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Instance</Text>
        <View style={styles.card}>
          <View style={styles.instanceRow}>
            <Globe size={18} color={Colors.dark.primary} />
            <View style={styles.instanceTextWrapper}>
              <Text style={styles.instanceLabel}>Connected to</Text>
              <Text style={styles.instanceUrl}>{instanceUrl || 'No instance configured'}</Text>
            </View>
          </View>
          <Text style={styles.instanceHint}>
            Your profile and permissions are synced from this FeatherPanel instance.
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <View style={styles.card}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/about')}
          >
            <Info size={20} color={Colors.dark.textSecondary} />
            <Text style={styles.menuItemText}>About</Text>
            <ExternalLink size={16} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/activity-log')}
          >
            <FileClock size={20} color={Colors.dark.textSecondary} />
            <Text style={styles.menuItemText}>Activity Log</Text>
            <ExternalLink size={16} color={Colors.dark.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={handleResetInstance}
          >
            <Settings size={20} color={Colors.dark.textSecondary} />
            <Text style={styles.menuItemText}>Reset instance</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, styles.dangerItem]}
            onPress={handleLogout}
            disabled={isLogoutLoading}
          >
            {isLogoutLoading ? (
              <ActivityIndicator size="small" color={Colors.dark.danger} />
            ) : (
              <LogOut size={20} color={Colors.dark.danger} />
            )}
            <Text style={[styles.menuItemText, styles.dangerText]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  const renderTabContent = () => {
    if (activeTab === 'overview') return renderOverviewTab();
    if (activeTab === 'security') return renderSecurityTab();
    return renderInstanceTab();
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {initials || '?'}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.userName}>
            {user?.first_name} {user?.last_name}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.username}>@{user?.username}</Text>

          {user?.role && (
            <View style={[styles.roleBadge, { backgroundColor: (user.role.color || '#666') + '20' }]}>
              <Shield size={14} color={user.role.color || '#666'} />
              <Text style={[styles.roleText, { color: user.role.color || '#666' }]}>
                {user.role.display_name || user.role.name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'overview' && styles.tabButtonActive]}
            onPress={() => setActiveTab('overview')}
          >
            <UserIcon size={18} color={activeTab === 'overview' ? Colors.dark.primary : Colors.dark.textMuted} />
            <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
              Overview
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'security' && styles.tabButtonActive]}
            onPress={() => setActiveTab('security')}
          >
            <Lock size={18} color={activeTab === 'security' ? Colors.dark.primary : Colors.dark.textMuted} />
            <Text style={[styles.tabText, activeTab === 'security' && styles.tabTextActive]}>
              Security
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'instance' && styles.tabButtonActive]}
            onPress={() => setActiveTab('instance')}
          >
            <Network size={18} color={activeTab === 'instance' ? Colors.dark.primary : Colors.dark.textMuted} />
            <Text style={[styles.tabText, activeTab === 'instance' && styles.tabTextActive]}>
              Instance
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tabContentContainer}>
          {renderTabContent()}
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
  scrollContent: {
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center' as const,
    paddingVertical: 24,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: Colors.dark.primary,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.dark.primary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700' as const,
    color: Colors.dark.text,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  username: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center' as const,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600' as const,
  },
  tabsRow: {
    flexDirection: 'row' as const,
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 999,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: Colors.dark.bg,
  },
  tabText: {
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  tabTextActive: {
    color: Colors.dark.primary,
    fontWeight: '600' as const,
  },
  tabContentContainer: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.textMuted,
    textTransform: 'uppercase' as const,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    marginBottom: 8,
  },
  cardRowLine: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  cardValue: {
    fontSize: 14,
    color: Colors.dark.text,
    fontWeight: '600' as const,
    marginLeft: 12,
  },
  cardValueSmall: {
    fontSize: 12,
    color: Colors.dark.text,
    marginLeft: 12,
  },
  cardValueMonospace: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    fontFamily: 'monospace' as const,
    marginLeft: 12,
  },
  instanceRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 12,
    marginBottom: 8,
  },
  instanceTextWrapper: {
    flex: 1,
  },
  instanceLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 2,
  },
  instanceUrl: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontFamily: 'monospace' as const,
  },
  instanceHint: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingVertical: 10,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark.text,
    marginLeft: 12,
  },
  dangerItem: {
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
    marginTop: 8,
    paddingTop: 12,
  },
  dangerText: {
    color: Colors.dark.danger,
  },
  footer: {
    alignItems: 'center' as const,
    paddingVertical: 24,
  },
  footerLogo: {
    width: 64,
    height: 64,
    marginBottom: 12,
    opacity: 0.5,
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