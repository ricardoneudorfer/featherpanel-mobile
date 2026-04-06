import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient, handleApiError } from '@/lib/api';
import { ArrowLeft, Clock, User, MapPin, Activity } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ActivityLog {
  id: number;
  user_uuid: string;
  name: string;
  context: string;
  ip_address: string;
  created_at: string;
  updated_at: string;
}

interface ActivitiesEnvelope {
  success: boolean;
  data: {
    activities: ActivityLog[];
    pagination: {
      current_page: number;
      per_page: number;
      total_records: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
  };
}

export default function ActivityLogsScreen() {
  const { instanceUrl, authToken } = useApp();
  const router = useRouter();

  const {
    data: activitiesEnvelope,
    isLoading,
    error,
    refetch,
  } = useQuery<ActivitiesEnvelope, Error>({
    queryKey: ['activities', instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken) {
        throw new Error('Not authenticated');
      }

      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get<ActivitiesEnvelope>('/api/user/activities?page=1&limit=10');

      if (!response.data.success || response.data.error) {
        throw new Error(response.data.error_message || 'Failed to fetch activities');
      }

      return response.data;
    },
    enabled: !!instanceUrl && !!authToken,
  });

  useEffect(() => {
    const interval = setInterval(async () => {
      if (refetch) {
        await refetch();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [refetch]);

  const activities = activitiesEnvelope?.data.activities || [];

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (name: string) => {
    switch (name.toLowerCase()) {
      case 'login':
        return User;
      default:
        return Activity;
    }
  };

  const renderActivity = ({ item }: { item: ActivityLog }) => {
    const Icon = getActivityIcon(item.name);
    return (
      <View style={styles.activityCard}>
        <View style={styles.activityHeader}>
          <View style={styles.activityIcon}>
            <Icon size={20} color={Colors.dark.primary} />
          </View>
          <View style={styles.activityContent}>
            <Text style={styles.activityContext} numberOfLines={1}>
              {item.context}
            </Text>
            <Text style={styles.activityName}>{item.name.toUpperCase()}</Text>
          </View>
          <Text style={styles.activityTime}>{formatDate(item.created_at)}</Text>
        </View>
        <View style={styles.activityFooter}>
          <View style={styles.ipContainer}>
            <MapPin size={14} color={Colors.dark.textSecondary} />
            <Text style={styles.ipAddress}>{item.ip_address}</Text>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !activitiesEnvelope) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContainer}>
          <Activity size={48} color={Colors.dark.danger} />
          <Text style={styles.errorText}>Failed to load activities</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        <Text style={styles.headerTitle}>Activity Logs</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={activities}
        renderItem={renderActivity}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Activity size={64} color={Colors.dark.textMuted} />
            <Text style={styles.emptyText}>No activities found</Text>
            <Text style={styles.emptySubtext}>Your recent activities will appear here</Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
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
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  activityCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  activityHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgTertiary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityContext: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 2,
  },
  activityName: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.dark.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  activityTime: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontWeight: '500' as const,
  },
  activityFooter: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  ipContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
  },
  ipAddress: {
    fontSize: 13,
    color: Colors.dark.primary,
    fontFamily: 'monospace' as const,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.dark.bg,
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: Colors.dark.danger,
    marginTop: 16,
    textAlign: 'center' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginTop: 8,
    textAlign: 'center' as const,
    paddingHorizontal: 32,
  },
});