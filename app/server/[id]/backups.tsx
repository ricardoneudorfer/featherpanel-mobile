import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, ScrollView, Switch, Linking, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import { HardDrive, Plus, Trash2, Download, RotateCcw, Lock, Unlock, X, FileArchive } from 'lucide-react-native';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

interface ServerBackup {
  id: number;
  uuid: string;
  name: string;
  ignored_files: string;
  disk: string;
  checksum: string;
  bytes: number;
  is_successful: number;
  is_locked: number;
  completed_at: string;
  created_at: string;
}

export default function ServerBackupsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { instanceUrl, authToken } = useApp();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [backupName, setBackupName] = useState('');
  const [ignoredFiles, setIgnoredFiles] = useState('');
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<ServerBackup | null>(null);
  const [truncateDirectory, setTruncateDirectory] = useState(true);
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

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['server-backups', id, instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/backups`, {
        params: { page: 1 }
      });
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to fetch backups';
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
    mutationFn: async (data: { name: string; ignore: string }) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/backups`, data);
      
      if (response.status !== 202 && response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to create backup';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-backups', id] });
      setShowCreateModal(false);
      setBackupName('');
      setIgnoredFiles('');
      Alert.alert('Success', data.message || 'Backup initiated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to create backup');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (backupUuid: string) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.delete(`/api/user/servers/${id}/backups/${backupUuid}`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to delete backup';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-backups', id] });
      Alert.alert('Success', data.message || 'Backup deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to delete backup');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (data: { uuid: string; truncate_directory: boolean }) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/backups/${data.uuid}/restore`, {
        truncate_directory: data.truncate_directory
      });
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to restore backup';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-backups', id] });
      setShowRestoreModal(false);
      setSelectedBackup(null);
      Alert.alert('Success', data.message || 'Backup restoration initiated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to restore backup');
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (backupUuid: string) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/backups/${backupUuid}/lock`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to lock backup';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-backups', id] });
      Alert.alert('Success', data.message || 'Backup locked successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to lock backup');
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (backupUuid: string) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/backups/${backupUuid}/unlock`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to unlock backup';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-backups', id] });
      Alert.alert('Success', data.message || 'Backup unlocked successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to unlock backup');
    },
  });

  const handleDownload = async (backup: ServerBackup) => {
    try {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/backups/${backup.uuid}/download`);
      
      if (response.status !== 200 || !response.data?.data?.download_url) {
        const message = response.data?.error_message || response.data?.message || 'Failed to get download URL';
        throw new Error(message);
      }
      
      const downloadUrl = response.data.data.download_url;
      const supported = await Linking.canOpenURL(downloadUrl);
      
      if (supported) {
        await Linking.openURL(downloadUrl);
      } else {
        Alert.alert('Download URL', downloadUrl);
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to download backup');
    }
  };

  const handleDelete = (backup: ServerBackup) => {
    if (backup.is_locked === 1) {
      Alert.alert('Locked', 'This backup is locked and cannot be deleted. Unlock it first.');
      return;
    }

    Alert.alert(
      'Delete Backup',
      `Are you sure you want to delete ${backup.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: () => deleteMutation.mutate(backup.uuid), 
          style: 'destructive' 
        },
      ]
    );
  };

  const handleRestore = (backup: ServerBackup) => {
    setSelectedBackup(backup);
    setShowRestoreModal(true);
  };

  const handleToggleLock = (backup: ServerBackup) => {
    if (backup.is_locked === 1) {
      unlockMutation.mutate(backup.uuid);
    } else {
      lockMutation.mutate(backup.uuid);
    }
  };

  const handleCreate = () => {
    if (!backupName.trim()) {
      Alert.alert('Error', 'Please enter a backup name');
      return;
    }

    const ignoredFilesArray = ignoredFiles
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    createMutation.mutate({
      name: backupName.trim(),
      ignore: JSON.stringify(ignoredFilesArray),
    });
  };

  const handleConfirmRestore = () => {
    if (!selectedBackup) return;

    restoreMutation.mutate({
      uuid: selectedBackup.uuid,
      truncate_directory: truncateDirectory,
    });
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const backups: ServerBackup[] = response?.data?.data || [];
  const backupLimit = serverResponse?.data?.backup_limit || 0;
  
  if (suspended) return <SuspendedScreen onBack={() => router.back()} />;
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.headerCount}>{backups.length} Backup{backups.length !== 1 ? 's' : ''}</Text>
          <Text style={styles.headerLimit}>Limit: {backupLimit}</Text>
        </View>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
          disabled={backups.length >= backupLimit}
        >
          <Plus size={20} color={backups.length >= backupLimit ? Colors.dark.textMuted : Colors.dark.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load backups</Text>
        </View>
      ) : (
        <FlatList
          data={backups}
          keyExtractor={(item) => item.uuid}
          renderItem={({ item }) => (
            <View style={styles.backupCard}>
              <View style={styles.backupHeader}>
                <View style={styles.backupHeaderLeft}>
                  <HardDrive size={24} color={Colors.dark.primary} />
                  <View style={styles.backupHeaderText}>
                    <Text style={styles.backupName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.backupDate}>{formatDate(item.completed_at || item.created_at)}</Text>
                  </View>
                </View>
                {item.is_locked === 1 && (
                  <Lock size={18} color={Colors.dark.warning} />
                )}
              </View>

              <View style={styles.backupInfo}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Size:</Text>
                  <Text style={styles.infoValue}>{formatBytes(item.bytes)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Checksum:</Text>
                  <Text style={styles.infoValue} numberOfLines={1}>{item.checksum}</Text>
                </View>
                {item.ignored_files && item.ignored_files !== '[]' && (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Ignored:</Text>
                    <Text style={styles.infoValue} numberOfLines={1}>{item.ignored_files}</Text>
                  </View>
                )}
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Status:</Text>
                  <Text style={[styles.infoValue, item.is_successful === 1 ? styles.successText : styles.errorText]}>
                    {item.is_successful === 1 ? 'Successful' : 'Failed'}
                  </Text>
                </View>
              </View>

              <View style={styles.backupActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDownload(item)}
                >
                  <Download size={18} color={Colors.dark.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleRestore(item)}
                >
                  <RotateCcw size={18} color={Colors.dark.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleLock(item)}
                  disabled={lockMutation.isPending || unlockMutation.isPending}
                >
                  {item.is_locked === 1 ? (
                    <Lock size={18} color={Colors.dark.warning} />
                  ) : (
                    <Unlock size={18} color={Colors.dark.textMuted} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, item.is_locked === 1 && styles.actionButtonDisabled]}
                  onPress={() => handleDelete(item)}
                  disabled={deleteMutation.isPending || item.is_locked === 1}
                >
                  <Trash2 size={18} color={item.is_locked === 1 ? Colors.dark.textMuted : Colors.dark.danger} />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FileArchive size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>No backups found</Text>
              <Text style={styles.emptySubtext}>Create your first backup to get started</Text>
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
                <Text style={styles.modalTitle}>Create Backup</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <X size={24} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalBody}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.inputLabel}>Backup Name</Text>
                <Text style={styles.inputDescription}>A unique name for this backup</Text>
                <TextInput
                  style={styles.input}
                  value={backupName}
                  onChangeText={setBackupName}
                  placeholder="backup-2026-02-05"
                  placeholderTextColor={Colors.dark.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>Ignored Files (Optional)</Text>
                <Text style={styles.inputDescription}>Comma-separated list of files or directories to exclude</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={ignoredFiles}
                  onChangeText={setIgnoredFiles}
                  placeholder="e.g., logs, temp, cache"
                  placeholderTextColor={Colors.dark.textMuted}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
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
                  disabled={createMutation.isPending}
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

      <Modal
        visible={showRestoreModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRestoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowRestoreModal(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Restore Backup</Text>
                <TouchableOpacity onPress={() => setShowRestoreModal(false)}>
                  <X size={24} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.restoreWarning}>
                  Are you sure you want to restore {selectedBackup?.name}?
                </Text>

                <View style={styles.switchContainer}>
                  <View style={styles.switchInfo}>
                    <Text style={styles.switchLabel}>Truncate Directory</Text>
                    <Text style={styles.switchDescription}>
                      Delete all files before restoring backup
                    </Text>
                  </View>
                  <Switch
                    value={truncateDirectory}
                    onValueChange={setTruncateDirectory}
                    trackColor={{ false: Colors.dark.border, true: Colors.dark.primary + '80' }}
                    thumbColor={truncateDirectory ? Colors.dark.primary : Colors.dark.textMuted}
                  />
                </View>
              </View>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowRestoreModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCreate]}
                  onPress={handleConfirmRestore}
                  disabled={restoreMutation.isPending}
                >
                  {restoreMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.dark.text} />
                  ) : (
                    <Text style={styles.modalButtonText}>Restore</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
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
  successText: {
    color: Colors.dark.success,
  },
  listContent: {
    padding: 16,
  },
  backupCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  backupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backupHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  backupHeaderText: {
    flex: 1,
  },
  backupName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  backupDate: {
    fontSize: 12,
    color: Colors.dark.textMuted,
  },
  backupInfo: {
    gap: 10,
    marginBottom: 16,
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
    flex: 1,
    textAlign: 'right',
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.dark.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  actionButtonDisabled: {
    opacity: 0.5,
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
  textArea: {
    minHeight: 80,
  },
  restoreWarning: {
    fontSize: 14,
    color: Colors.dark.text,
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.bg,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  switchInfo: {
    flex: 1,
    marginRight: 12,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  switchDescription: {
    fontSize: 12,
    color: Colors.dark.textMuted,
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