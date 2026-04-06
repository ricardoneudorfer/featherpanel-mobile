import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import { Network, Trash2, Star, RefreshCw, Plus } from 'lucide-react-native';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

interface Allocation {
  id: number;
  ip: string;
  ip_alias: string;
  port: number;
  is_primary: boolean;
  notes: string;
}

export default function ServerAllocationsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { instanceUrl, authToken } = useApp();
  const queryClient = useQueryClient();
  const { suspended } = useServerDetails(id);

  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['server-allocations', id, instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/allocations`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to fetch allocations';
        throw new Error(message);
      }
      
      return response.data;
    },
    enabled: !!instanceUrl && !!authToken && !!id,
    retry: false,
    refetchInterval: 1000,
    staleTime: 0,
  });

  const autoAssignMutation = useMutation({
    mutationFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/allocations/auto`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to assign allocation';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-allocations', id] });
      Alert.alert('Success', data.message || 'Allocation assigned successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to assign allocation');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (allocationId: number) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.delete(`/api/user/servers/${id}/allocations/${allocationId}`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to delete allocation';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-allocations', id] });
      Alert.alert('Success', data.data?.message || 'Allocation deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to delete allocation');
    },
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (allocationId: number) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/allocations/${allocationId}/primary`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to set primary allocation';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-allocations', id] });
      Alert.alert('Success', data.message || 'Primary allocation updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to set primary allocation');
    },
  });

  const handleDelete = (allocation: Allocation) => {
    if (allocation.is_primary) {
      Alert.alert('Cannot Delete', 'You cannot delete the primary allocation.');
      return;
    }

    Alert.alert(
      'Delete Allocation',
      `Remove ${allocation.ip}:${allocation.port}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: () => deleteMutation.mutate(allocation.id), 
          style: 'destructive' 
        },
      ]
    );
  };

  const handleSetPrimary = (allocation: Allocation) => {
    Alert.alert(
      'Set Primary',
      `Set ${allocation.ip}:${allocation.port} as primary allocation?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => setPrimaryMutation.mutate(allocation.id) },
      ]
    );
  };

  const handleAutoAssign = () => {
    if (!canAddMore) {
      Alert.alert('Limit Reached', 'You have reached the allocation limit for this server.');
      return;
    }

    Alert.alert(
      'Auto Assign Allocation',
      'Automatically assign a new allocation to this server?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Assign', onPress: () => autoAssignMutation.mutate() },
      ]
    );
  };

  const allocations: Allocation[] = response?.data?.allocations || [];
  const allocationLimit = response?.data?.server?.allocation_limit || 0;
  const currentAllocations = response?.data?.server?.current_allocations || 0;
  const canAddMore = response?.data?.server?.can_add_more || false;

  if (suspended) return <SuspendedScreen onBack={() => router.back()} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerCount}>{currentAllocations} Allocation{currentAllocations !== 1 ? 's' : ''}</Text>
          <Text style={styles.headerLimit}>Limit: {allocationLimit}</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAutoAssign}
          disabled={!canAddMore || autoAssignMutation.isPending}
        >
          <Plus size={20} color={!canAddMore ? Colors.dark.textMuted : Colors.dark.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load allocations</Text>
        </View>
      ) : (
        <FlatList
          data={allocations}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.allocationCard}>
              <View style={styles.allocationHeader}>
                <Network size={24} color={Colors.dark.primary} />
                <View style={styles.allocationInfo}>
                  <Text style={styles.allocationAddress}>
                    {item.ip_alias || item.ip}:{item.port}
                  </Text>
                  {item.is_primary && (
                    <View style={styles.primaryBadge}>
                      <Star size={12} color={Colors.dark.warning} fill={Colors.dark.warning} />
                      <Text style={styles.primaryText}>Primary</Text>
                    </View>
                  )}
                  {item.notes && (
                    <Text style={styles.allocationNotes}>{item.notes}</Text>
                  )}
                </View>
              </View>

              <View style={styles.allocationActions}>
                {!item.is_primary && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.primaryButton]}
                    onPress={() => handleSetPrimary(item)}
                    disabled={setPrimaryMutation.isPending}
                  >
                    <Star size={16} color="#fff" />
                    <Text style={styles.actionButtonText}>Set Primary</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton, item.is_primary && styles.disabledButton]}
                  onPress={() => handleDelete(item)}
                  disabled={deleteMutation.isPending || item.is_primary}
                >
                  <Trash2 size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Network size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>No allocations</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    padding: 16,
    backgroundColor: Colors.dark.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  headerInfo: {
    flex: 1,
  },
  headerCount: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  headerLimit: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.dark.bg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  errorText: {
    color: Colors.dark.danger,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  allocationCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  allocationHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 12,
    gap: 12,
  },
  allocationInfo: {
    flex: 1,
  },
  allocationAddress: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    fontFamily: 'monospace',
    marginBottom: 6,
  },
  allocationNotes: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginTop: 4,
  },
  primaryBadge: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: Colors.dark.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start' as const,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.dark.warning,
  },
  allocationActions: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  primaryButton: {
    backgroundColor: Colors.dark.warning,
  },
  deleteButton: {
    backgroundColor: Colors.dark.danger,
  },
  disabledButton: {
    opacity: 0.4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.dark.text,
  },
});