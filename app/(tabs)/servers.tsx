import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useApp } from '@/contexts/AppContext';
import { createApiClient, handleApiError } from '@/lib/api';
import type { Server, ServersEnvelope } from '@/types/api';
import Colors from '@/constants/colors';
import { Server as ServerIcon, Info, AlertTriangle } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ServersScreen() {
  const { instanceUrl, authToken, clearAuth } = useApp();
  const router = useRouter();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const queryClient = useQueryClient();

  const version = useMemo(() => Date.now().toString(), []);

  const {
    data: servers = [],
    error,
    refetch,
  } = useQuery<Server[], Error>({
    queryKey: ['servers', instanceUrl, authToken, version],
    queryFn: async () => {
      if (!instanceUrl || !authToken) {
        queryClient.setQueryData(['servers', instanceUrl, authToken, version], []);
        throw new Error('Not authenticated');
      }

      try {
        const api = createApiClient(instanceUrl, authToken);
        const response = await api.get<ServersEnvelope>('/api/user/servers?view_all=false');

        if (response.status !== 200) {
          queryClient.setQueryData(['servers', instanceUrl, authToken, version], []);
          
          const code = response.data?.error_code;
          const message = response.data?.error_message || response.data?.message || 'Failed to fetch servers';

          if (code === 'INVALID_ACCOUNT_TOKEN') {
            await clearAuth().catch(() => undefined);
            router.replace('/');
          }

          throw new Error(message);
        }

        if (!response.data.success || response.data.error) {
          queryClient.setQueryData(['servers', instanceUrl, authToken, version], []);
          
          const code = response.data.error_code;
          const message = response.data.error_message || response.data.message || 'Failed to fetch servers';

          if (code === 'INVALID_ACCOUNT_TOKEN') {
            await clearAuth().catch(() => undefined);
            router.replace('/');
          }

          throw new Error(message);
        }

        const serverData = response.data.data?.servers || [];
        
        if (serverData.length === 0) {
          queryClient.setQueryData(['servers', instanceUrl, authToken, version], []);
          return [];
        }

        return serverData;
      } catch (error) {
        queryClient.setQueryData(['servers', instanceUrl, authToken, version], []);
        throw error;
      }
    },
    enabled: !!instanceUrl && !!authToken,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (instanceUrl && authToken) {
      refetch();
    }
  }, [instanceUrl, authToken, refetch]);

  useEffect(() => {
    if (instanceUrl && authToken) {
      intervalRef.current = setInterval(async () => {
        await refetch();
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [instanceUrl, authToken, refetch]);

  const handleManualRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const getStatusColor = (status: string | null | undefined, suspended: number | undefined) => {
    if (suspended === 1) return Colors.dark.danger;
    
    const safeStatus = status?.toLowerCase() || 'offline';
    switch (safeStatus) {
      case 'running':
        return Colors.dark.success;
      case 'offline':
      case 'stopped':
        return Colors.dark.textMuted;
      case 'starting':
      case 'stopping':
      case 'installing':
        return Colors.dark.warning;
      case 'unknown':
        return Colors.dark.textMuted;
      default:
        return Colors.dark.danger;
    }
  };

  const suspendedCount = servers.filter((s) => s.suspended === 1).length;
  const unknownCount = servers.filter(
    (s) => (s.status?.toLowerCase() || 'unknown') === 'unknown' && s.suspended !== 1
  ).length;

  const renderServer = ({ item }: { item: Server }) => {
    const isSuspended = item.suspended === 1;
    const isDisabled = isSuspended;
    const statusColor = getStatusColor(item.status, item.suspended);
    const statusText = isSuspended ? 'suspended' : (item.status || 'unkown');

    return (
      <TouchableOpacity
        style={[
          styles.serverCard,
          isDisabled && { 
            opacity: 0.5, 
            borderColor: statusColor + '50',
            borderWidth: 2 
          }
        ]}
        onPress={isDisabled ? undefined : () => {
          router.push(`/server/${item.uuidShort}`);
        }}
        activeOpacity={isDisabled ? 0.5 : 0.7}
        testID={`server-${item.uuidShort}`}
      >
        <View style={styles.serverHeader}>
          <View style={styles.serverIcon}>
            <ServerIcon size={24} color={Colors.dark.primary} />
          </View>
          <View style={styles.serverInfo}>
            <Text style={styles.serverName} numberOfLines={1}>
              {item.name}
            </Text>
            {item.description && (
              <Text style={styles.serverDescription} numberOfLines={1}>
                {item.description}
              </Text>
            )}
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>
        </View>

        <View style={styles.serverDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>CPU Limit</Text>
            <Text style={styles.detailValue}>
              {item.cpu === 0 || item.cpu === '0' ? '∞' : `${item.cpu}%`}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Memory</Text>
            <Text style={styles.detailValue}>
              {item.memory === 0 || item.memory === '0' ? '∞' : `${Math.round(item.memory / 1024)} GB`}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Disk</Text>
            <Text style={styles.detailValue}>
              {item.disk === 0 || item.disk === '0' ? '∞' : `${Math.round(item.disk / 1024)} GB`}
            </Text>
          </View>
        </View>

        {item.allocation && (
          <View style={styles.allocationInfo}>
            <Text style={styles.allocationText}>
              {item.allocation.ip}:{item.allocation.port}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {suspendedCount > 0 && (
        <View style={[styles.infoBanner, { backgroundColor: Colors.dark.danger + '15' }]}>
          <AlertTriangle size={18} color={Colors.dark.danger} style={styles.infoBannerIcon} />
          <Text style={styles.infoBannerText}>
            <Text style={styles.infoBannerBold}>
              {suspendedCount} server{suspendedCount > 1 ? 's are' : ' is'} suspended.
            </Text>
            {' '}These servers are temporarily unavailable.
          </Text>
        </View>
      )}
      
      {unknownCount > 0 && (
        <View style={styles.infoBanner}>
          <Info size={18} color={Colors.dark.primary} style={styles.infoBannerIcon} />
          <Text style={styles.infoBannerText}>
            <Text style={styles.infoBannerBold}>
              {unknownCount} server{unknownCount > 1 ? 's have' : ' has'} an "unknown" status.
            </Text>
            {' '}This means the node did not respond in time. The servers may still be working — tap to connect.
          </Text>
        </View>
      )}

      <FlatList
        data={servers}
        renderItem={renderServer}
        keyExtractor={(item) => item.uuid}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ServerIcon size={64} color={Colors.dark.textMuted} />
            <Text style={styles.emptyText}>No servers found</Text>
            <Text style={styles.emptySubtext}>
              No access to servers or check your permissions
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={handleManualRefresh}
            tintColor={Colors.dark.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  infoBanner: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    padding: 12,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.dark.primary + '35',
  },
  infoBannerIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 19,
  },
  infoBannerBold: {
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  serverCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  serverHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  serverIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.dark.bgTertiary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  serverInfo: {
    flex: 1,
  },
  serverName: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  serverDescription: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  serverDetails: {
    flexDirection: 'row' as const,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
  allocationInfo: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  allocationText: {
    fontSize: 13,
    color: Colors.dark.primary,
    fontFamily: 'monospace' as const,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 20,
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