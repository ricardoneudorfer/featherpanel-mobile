import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import { Database, Plus, Trash2, Eye, EyeOff, X } from 'lucide-react-native';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

interface ServerDatabase {
  id: number;
  database: string;
  username: string;
  password: string;
  database_host: string;
  database_port: number;
  remote: string;
  max_connections: number;
  database_type?: string;
  database_host_name?: string;
}

interface DatabaseHost {
  id: number;
  name: string;
  database_type: string;
  database_port: number;
  database_host: string;
}

export default function ServerDatabasesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { instanceUrl, authToken } = useApp();
  const queryClient = useQueryClient();
  const [showPasswords, setShowPasswords] = useState<{ [key: number]: boolean }>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [databaseName, setDatabaseName] = useState('');
  const [remote, setRemote] = useState('%');
  const [maxConnections, setMaxConnections] = useState('0');
  const [selectedHostId, setSelectedHostId] = useState<number | null>(null);
  const { suspended } = useServerDetails(id);

  const { data: serverResponse } = useQuery({
    queryKey: ['server', id, instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to fetch server';
        throw new Error(message);
      }
      
      return response.data;
    },
    enabled: !!instanceUrl && !!authToken && !!id,
    retry: false,
    staleTime: 0,
  });

  const { data: hostsResponse } = useQuery({
    queryKey: ['database-hosts', id, instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/databases/hosts`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to fetch database hosts';
        throw new Error(message);
      }
      
      return response.data;
    },
    enabled: !!instanceUrl && !!authToken && !!id,
    retry: false,
    staleTime: 0,
  });

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['server-databases', id, instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/databases`, {
        params: { page: 1, per_page: 20 }
      });
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to fetch databases';
        throw new Error(message);
      }
      
      return response.data;
    },
    enabled: !!instanceUrl && !!authToken && !!id,
    retry: false,
    refetchInterval: 1000,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { database_host_id: number; database_name: string; remote: string; max_connections: number }) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/databases`, data);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to create database';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-databases', id] });
      setShowCreateModal(false);
      setDatabaseName('');
      setRemote('%');
      setMaxConnections('0');
      setSelectedHostId(null);
      Alert.alert('Success', data.data?.message || 'Database created successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to create database');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (databaseId: number) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.delete(`/api/user/servers/${id}/databases/${databaseId}`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to delete database';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-databases', id] });
      Alert.alert('Success', data.data?.message || 'Database deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to delete database');
    },
  });

  const handleDelete = (database: ServerDatabase) => {
    Alert.alert(
      'Delete Database',
      `Are you sure you want to delete ${database.database}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: () => deleteMutation.mutate(database.id), 
          style: 'destructive' 
        },
      ]
    );
  };

  const handleCreate = () => {
    if (!databaseName.trim()) {
      Alert.alert('Error', 'Please enter a database name');
      return;
    }
    if (!selectedHostId) {
      Alert.alert('Error', 'Please select a database host');
      return;
    }

    createMutation.mutate({
      database_host_id: selectedHostId,
      database_name: databaseName.trim(),
      remote: remote.trim() || '%',
      max_connections: parseInt(maxConnections) || 0,
    });
  };

  const togglePasswordVisibility = (id: number) => {
    setShowPasswords(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (hostsResponse?.data && Array.isArray(hostsResponse.data) && hostsResponse.data.length > 0 && !selectedHostId) {
      setSelectedHostId(hostsResponse.data[0].id);
    }
  }, [hostsResponse, selectedHostId]);

  const databases: ServerDatabase[] = response?.data?.data || [];
  const databaseLimit = serverResponse?.data?.database_limit || 0;
  const hosts: DatabaseHost[] = hostsResponse?.data || [];

  if (suspended) return <SuspendedScreen onBack={() => router.back()} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerCount}>{databases.length} Database{databases.length !== 1 ? 's' : ''}</Text>
          <Text style={styles.headerLimit}>Limit: {databaseLimit}</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          disabled={databases.length >= databaseLimit}
        >
          <Plus size={20} color={databases.length >= databaseLimit ? Colors.dark.textMuted : Colors.dark.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load databases</Text>
        </View>
      ) : (
        <FlatList
          data={databases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.databaseCard}>
              <View style={styles.databaseHeader}>
                <Database size={24} color={Colors.dark.primary} />
                <Text style={styles.databaseName} numberOfLines={1}>{item.database}</Text>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(item)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={18} color={Colors.dark.danger} />
                </TouchableOpacity>
              </View>

              <View style={styles.databaseInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Host:</Text>
                  <Text style={styles.infoValue}>{item.database_host}:{item.database_port}</Text>
                </View>
                {item.database_host_name && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Host Name:</Text>
                    <Text style={styles.infoValue}>{item.database_host_name}</Text>
                  </View>
                )}
                {item.database_type && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Type:</Text>
                    <Text style={styles.infoValue}>{item.database_type}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Username:</Text>
                  <Text style={styles.infoValue}>{item.username}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Password:</Text>
                  <View style={styles.passwordRow}>
                    <Text style={styles.infoValue}>
                      {showPasswords[item.id] ? item.password : '••••••••'}
                    </Text>
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => togglePasswordVisibility(item.id)}
                    >
                      {showPasswords[item.id] ? (
                        <EyeOff size={16} color={Colors.dark.textMuted} />
                      ) : (
                        <Eye size={16} color={Colors.dark.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Remote:</Text>
                  <Text style={styles.infoValue}>{item.remote}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Max Connections:</Text>
                  <Text style={styles.infoValue}>{item.max_connections}</Text>
                </View>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Database size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>No databases found</Text>
              <Text style={styles.emptySubtext}>Create your first database to get started</Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <Modal
        visible={showCreateModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowCreateModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Database</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <X size={24} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.inputLabel}>Database Host</Text>
                {hosts.length === 0 ? (
                  <Text style={styles.noHostsText}>No database hosts available</Text>
                ) : (
                  <View style={styles.hostsContainer}>
                    {hosts.map((host) => (
                      <TouchableOpacity
                        key={host.id}
                        style={[
                          styles.hostOption,
                          selectedHostId === host.id && styles.hostOptionSelected
                        ]}
                        onPress={() => setSelectedHostId(host.id)}
                      >
                        <View style={styles.hostOptionContent}>
                          <Text style={styles.hostOptionName}>{host.name}</Text>
                          <Text style={styles.hostOptionDetails}>
                            {host.database_type} - {host.database_host}:{host.database_port}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.inputLabel}>Database Name</Text>
                <Text style={styles.inputDescription}>The name of the database to create</Text>
                <TextInput
                  style={styles.input}
                  value={databaseName}
                  onChangeText={setDatabaseName}
                  placeholder="Enter database name"
                  placeholderTextColor={Colors.dark.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>Remote Access</Text>
                <Text style={styles.inputDescription}>Host pattern for remote access (e.g., % for any host)</Text>
                <TextInput
                  style={styles.input}
                  value={remote}
                  onChangeText={setRemote}
                  placeholder="%"
                  placeholderTextColor={Colors.dark.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>Max Connections</Text>
                <Text style={styles.inputDescription}>Maximum number of concurrent connections (0 for unlimited)</Text>
                <TextInput
                  style={styles.input}
                  value={maxConnections}
                  onChangeText={setMaxConnections}
                  placeholder="0"
                  placeholderTextColor={Colors.dark.textMuted}
                  keyboardType="numeric"
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowCreateModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCreate]}
                  onPress={handleCreate}
                  disabled={createMutation.isPending || hosts.length === 0}
                >
                  {createMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.dark.text} />
                  ) : (
                    <Text style={styles.modalButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  headerLimit: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: Colors.dark.danger,
    fontSize: 16,
  },
  listContent: {
    padding: 16,
  },
  databaseCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  databaseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  databaseName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  deleteButton: {
    padding: 8,
  },
  databaseInfo: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 13,
    color: Colors.dark.text,
    fontFamily: 'monospace',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeButton: {
    padding: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalContainer: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  modalBody: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
    marginTop: 16,
  },
  inputDescription: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 8,
    marginTop: -4,
  },
  input: {
    backgroundColor: Colors.dark.bg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.dark.text,
  },
  hostsContainer: {
    gap: 8,
  },
  hostOption: {
    backgroundColor: Colors.dark.bg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    padding: 12,
  },
  hostOptionSelected: {
    borderColor: Colors.dark.primary,
    backgroundColor: Colors.dark.primary + '20',
  },
  hostOptionContent: {
    gap: 4,
  },
  hostOptionName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  hostOptionDetails: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontFamily: 'monospace',
  },
  noHostsText: {
    fontSize: 14,
    color: Colors.dark.textMuted,
    textAlign: 'center',
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  modalButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.dark.bg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  modalButtonCreate: {
    backgroundColor: Colors.dark.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  modalButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.textMuted,
  },
});