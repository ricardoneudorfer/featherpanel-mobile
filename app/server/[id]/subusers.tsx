import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput, Modal, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import { Users, Mail, Plus, Trash2, X, Edit, CheckSquare, Square } from 'lucide-react-native';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

interface Subuser {
  id: number;
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  permissions: string[];
}

interface PermissionDisplay {
  [key: string]: {
    title: string;
    description: string;
  };
}

interface GroupedPermissions {
  [key: string]: {
    permissions: string[];
  };
}

const PERMISSION_DISPLAY: PermissionDisplay = {
  'websocket.connect': {
    title: 'Connect',
    description: 'Allows a user to connect to the server console via WebSocket.'
  },
  'control.start': {
    title: 'Start',
    description: 'Allows a user to start the server if it is stopped.'
  },
  'control.stop': {
    title: 'Stop',
    description: 'Allows a user to stop a server if it is running.'
  },
  'control.restart': {
    title: 'Restart',
    description: 'Allows a user to perform a server restart. This allows them to start the server if it is offline, but not put the server in a completely stopped state.'
  },
  'control.console': {
    title: 'Console',
    description: 'Allows a user to send commands to the server instance via the console.'
  },
  'user.create': {
    title: 'Create',
    description: 'Allows a user to create new subusers for the server.'
  },
  'user.read': {
    title: 'Read',
    description: 'Allows the user to view subusers and their permissions for the server.'
  },
  'user.update': {
    title: 'Update',
    description: 'Allows a user to modify other subusers.'
  },
  'user.delete': {
    title: 'Delete',
    description: 'Allows a user to delete a subuser from the server.'
  },
  'file.create': {
    title: 'Create',
    description: 'Allows a user to create additional files and folders via the Panel or direct upload.'
  },
  'file.read': {
    title: 'Read',
    description: 'Allows a user to view the contents of a directory, but not view the contents of or download files.'
  },
  'file.read_content': {
    title: 'Read Content',
    description: 'Allows a user to view the contents of a given file. This will also allow the user to download files.'
  },
  'file.update': {
    title: 'Update',
    description: 'Allows a user to update the contents of an existing file or directory.'
  },
  'file.delete': {
    title: 'Delete',
    description: 'Allows a user to delete files or directories.'
  },
  'file.archive': {
    title: 'Archive',
    description: 'Allows a user to archive the contents of a directory as well as decompress existing archives on the system.'
  },
  'file.sftp': {
    title: 'SFTP',
    description: 'Allows a user to connect to SFTP and manage server files using the other assigned file permissions.'
  },
  'backup.create': {
    title: 'Create',
    description: 'Allows a user to create new backups for this server.'
  },
  'backup.read': {
    title: 'Read',
    description: 'Allows a user to view all backups that exist for this server.'
  },
  'backup.delete': {
    title: 'Delete',
    description: 'Allows a user to remove backups from the system.'
  },
  'backup.download': {
    title: 'Download',
    description: 'Allows a user to download a backup for the server. Danger: this allows a user to access all files for the server in the backup.'
  },
  'backup.restore': {
    title: 'Restore',
    description: 'Allows a user to restore a backup for the server. Danger: this allows the user to delete all of the server files in the process.'
  },
  'allocation.read': {
    title: 'Read',
    description: 'Allows a user to view all allocations currently assigned to this server. Users with any level of access to this server can always view the primary allocation.'
  },
  'allocation.create': {
    title: 'Create',
    description: 'Allows a user to assign additional allocations to the server.'
  },
  'allocation.update': {
    title: 'Update',
    description: 'Allows a user to change the primary server allocation and attach notes to each allocation.'
  },
  'allocation.delete': {
    title: 'Delete',
    description: 'Allows a user to delete an allocation from the server.'
  },
  'startup.read': {
    title: 'Read',
    description: 'Allows a user to view the startup parameters for a server.'
  },
  'startup.update': {
    title: 'Update',
    description: 'Allows a user to modify startup parameters for a server.'
  },
  'startup.docker-image': {
    title: 'startup.docker-image',
    description: ''
  },
  'template.read': {
    title: 'Read',
    description: 'Allows a user to view available server templates.'
  },
  'template.install': {
    title: 'Install',
    description: 'Allows a user to install templates on the server.'
  },
  'database.create': {
    title: 'Create',
    description: 'Allows a user to create new databases for this server.'
  },
  'database.read': {
    title: 'Read',
    description: 'Allows a user to view all databases that exist for this server.'
  },
  'database.update': {
    title: 'Update',
    description: 'Allows a user to view passwords for databases.'
  },
  'database.delete': {
    title: 'Delete',
    description: 'Allows a user to remove databases from the system.'
  },
  'database.view_password': {
    title: 'database.view_password',
    description: ''
  },
  'schedule.create': {
    title: 'Create',
    description: 'Allows a user to create new schedules for this server.'
  },
  'schedule.read': {
    title: 'Read',
    description: 'Allows a user to view all schedules that exist for this server.'
  },
  'schedule.update': {
    title: 'Update',
    description: 'Allows a user to modify schedules for a server.'
  },
  'schedule.delete': {
    title: 'Delete',
    description: 'Allows a user to remove schedules from the system.'
  },
  'settings.rename': {
    title: 'Rename',
    description: 'Allows a user to rename a server.'
  },
  'settings.change-egg': {
    title: 'settings.change-egg',
    description: ''
  },
  'reinstall': {
    title: 'Reinstall',
    description: 'Allows a user to trigger a server reinstallation.'
  },
  'activity.read': {
    title: 'Read',
    description: 'Allows a user to view server activity.'
  },
  'subdomain.manage': {
    title: 'Manage',
    description: 'Allows a user to create, update, delete, and sync subdomains for this server.'
  },
  'firewall.read': {
    title: 'Read',
    description: 'Allows a user to view the firewall rules for this server.'
  },
  'firewall.manage': {
    title: 'Manage',
    description: 'Allows a user to create, update, and delete firewall rules for this server.'
  },
  'proxy.read': {
    title: 'Read',
    description: 'Allows a user to view the proxy rules for this server.'
  },
  'proxy.manage': {
    title: 'Manage',
    description: 'Allows a user to create, update, and delete proxy rules for this server.'
  },
  'import.read': {
    title: 'Read',
    description: 'Allows a user to view server imports.'
  },
  'import.manage': {
    title: 'Manage',
    description: 'Allows a user to create and manage server imports.'
  },
};

export default function ServerSubusersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { instanceUrl, authToken } = useApp();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [email, setEmail] = useState('');
  const [selectedSubuser, setSelectedSubuser] = useState<Subuser | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const { suspended } = useServerDetails(id);

  const { data: response, isLoading, error } = useQuery({
    queryKey: ['server-subusers', id, instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/subusers`, {
        params: { page: 1, per_page: 20 }
      });
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to fetch subusers';
        throw new Error(message);
      }
      
      return response.data;
    },
    enabled: !!instanceUrl && !!authToken && !!id,
    retry: false,
    refetchInterval: 1000,
    staleTime: 0,
  });

  const { data: permissionsResponse } = useQuery({
    queryKey: ['server-permissions', id, instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/subusers/permissions`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to fetch permissions';
        throw new Error(message);
      }
      
      return response.data;
    },
    enabled: !!instanceUrl && !!authToken && !!id,
    retry: false,
    staleTime: 0,
  });

  const createMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/subusers`, data);
      
      if (response.status !== 201 && response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to create subuser';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-subusers', id] });
      setShowCreateModal(false);
      setEmail('');
      Alert.alert('Success', data.message || 'Subuser created successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to create subuser');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { subuserId: number; permissions: string[] }) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.patch(`/api/user/servers/${id}/subusers/${data.subuserId}`, {
        permissions: data.permissions
      });
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to update subuser';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-subusers', id] });
      setShowEditModal(false);
      setSelectedSubuser(null);
      setSelectedPermissions([]);
      Alert.alert('Success', data.message || 'Subuser updated successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to update subuser');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (subuserId: number) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.delete(`/api/user/servers/${id}/subusers/${subuserId}`);
      
      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to delete subuser';
        throw new Error(message);
      }
      
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['server-subusers', id] });
      Alert.alert('Success', data.message || 'Subuser deleted successfully');
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to delete subuser');
    },
  });

  const handleCreate = () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    createMutation.mutate({ email: email.trim() });
  };

  const handleEdit = (subuser: Subuser) => {
    setSelectedSubuser(subuser);
    setSelectedPermissions(subuser.permissions || []);
    setShowEditModal(true);
  };

  const handleDelete = (subuser: Subuser) => {
    Alert.alert(
      'Delete Subuser',
      `Remove ${subuser.username} from this server?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          onPress: () => deleteMutation.mutate(subuser.id), 
          style: 'destructive' 
        },
      ]
    );
  };

  const handleUpdatePermissions = () => {
    if (!selectedSubuser) return;

    updateMutation.mutate({
      subuserId: selectedSubuser.id,
      permissions: selectedPermissions,
    });
  };

  const togglePermission = (permission: string) => {
    setSelectedPermissions(prev => {
      if (prev.includes(permission)) {
        return prev.filter(p => p !== permission);
      } else {
        return [...prev, permission];
      }
    });
  };

  const toggleGroupPermissions = (groupPermissions: string[]) => {
    const allSelected = groupPermissions.every(p => selectedPermissions.includes(p));
    
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !groupPermissions.includes(p)));
    } else {
      setSelectedPermissions(prev => {
        const newPerms = [...prev];
        groupPermissions.forEach(p => {
          if (!newPerms.includes(p)) {
            newPerms.push(p);
          }
        });
        return newPerms;
      });
    }
  };

  const selectAllPermissions = () => {
    const allPermissions = permissionsResponse?.data?.permissions || [];
    setSelectedPermissions(allPermissions);
  };

  const deselectAllPermissions = () => {
    setSelectedPermissions([]);
  };

  const subusers: Subuser[] = response?.data?.data || [];
  const groupedPermissions: GroupedPermissions = permissionsResponse?.data?.grouped_permissions || {};

  const getPermissionDisplay = (permission: string) => {
    return PERMISSION_DISPLAY[permission as keyof PermissionDisplay] || { title: permission, description: '' };
  };

  if (suspended) return <SuspendedScreen onBack={() => router.back()} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerCount}>{subusers.length} Subuser{subusers.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Plus size={20} color={Colors.dark.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load subusers</Text>
        </View>
      ) : (
        <FlatList
          data={subusers}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.subuserCard}>
              <View style={styles.subuserHeader}>
                <Users size={24} color={Colors.dark.primary} />
                <View style={styles.subuserInfo}>
                  <Text style={styles.subuserName}>
                    {item.first_name} {item.last_name} (@{item.username})
                  </Text>
                  <View style={styles.emailRow}>
                    <Mail size={14} color={Colors.dark.textMuted} />
                    <Text style={styles.subuserEmail}>{item.email}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.permissionsContainer}>
                <Text style={styles.permissionsLabel}>
                  Permissions: {item.permissions?.length || 0}
                </Text>
              </View>

              <View style={styles.subuserActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => handleEdit(item)}
                >
                  <Edit size={16} color="#fff" />
                  <Text style={styles.actionButtonText}>Edit Permissions</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => handleDelete(item)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Users size={48} color={Colors.dark.textMuted} />
              <Text style={styles.emptyText}>No subusers yet</Text>
              <Text style={styles.emptySubtext}>Grant others access to this server</Text>
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
                <Text style={styles.modalTitle}>Add Subuser</Text>
                <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                  <X size={24} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <Text style={styles.inputDescription}>Enter the email of an existing user</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="user@example.com"
                  placeholderTextColor={Colors.dark.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

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
                    <Text style={styles.modalButtonText}>Add</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={showEditModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setShowEditModal(false)}
          />
          <View style={styles.modalContainerLarge}>
            <View style={styles.modalContentLarge}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Permissions</Text>
                <TouchableOpacity onPress={() => setShowEditModal(false)}>
                  <X size={24} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.selectAllContainer}>
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={selectAllPermissions}
                >
                  <Text style={styles.selectAllButtonText}>Select All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.selectAllButton}
                  onPress={deselectAllPermissions}
                >
                  <Text style={styles.selectAllButtonText}>Deselect All</Text>
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalBodyScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {Object.entries(groupedPermissions).map(([groupName, group]) => {
                  const allGroupSelected = group.permissions.every(p => selectedPermissions.includes(p));
                  const someGroupSelected = group.permissions.some(p => selectedPermissions.includes(p));

                  return (
                    <View key={groupName} style={styles.permissionGroup}>
                      <TouchableOpacity
                        style={styles.permissionGroupHeader}
                        onPress={() => toggleGroupPermissions(group.permissions)}
                      >
                        {allGroupSelected ? (
                          <CheckSquare size={20} color={Colors.dark.primary} />
                        ) : someGroupSelected ? (
                          <Square size={20} color={Colors.dark.primary} />
                        ) : (
                          <Square size={20} color={Colors.dark.textMuted} />
                        )}
                        <Text style={styles.permissionGroupName}>
                          {groupName.charAt(0).toUpperCase() + groupName.slice(1)}
                        </Text>
                      </TouchableOpacity>

                      {group.permissions.map((permission) => {
                        const display = getPermissionDisplay(permission);
                        return (
                          <TouchableOpacity
                            key={permission}
                            style={styles.permissionItem}
                            onPress={() => togglePermission(permission)}
                          >
                            {selectedPermissions.includes(permission) ? (
                              <CheckSquare size={18} color={Colors.dark.primary} />
                            ) : (
                              <Square size={18} color={Colors.dark.textMuted} />
                            )}
                            <View style={styles.permissionContent}>
                              <Text style={styles.permissionTitle} numberOfLines={1}>{display.title}</Text>
                              {display.description ? (
                                <Text style={styles.permissionDescription} numberOfLines={2}>
                                  {display.description}
                                </Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setShowEditModal(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCreate]}
                  onPress={handleUpdatePermissions}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <ActivityIndicator size="small" color={Colors.dark.text} />
                  ) : (
                    <Text style={styles.modalButtonText}>Update</Text>
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
  headerCount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  addButton: {
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
  subuserCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  subuserHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  subuserInfo: {
    flex: 1,
  },
  subuserName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 6,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subuserEmail: {
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  permissionsContainer: {
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
  },
  permissionsLabel: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
  },
  subuserActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors.dark.primary,
  },
  deleteButton: {
    backgroundColor: Colors.dark.danger,
    flex: 0,
    paddingHorizontal: 16,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
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
  modalContainerLarge: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalContent: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalContentLarge: {
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
  },
  modalBodyScroll: {
    padding: 20,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  inputDescription: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    marginBottom: 8,
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
  selectAllContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  selectAllButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.dark.bg,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  selectAllButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  permissionGroup: {
    marginBottom: 20,
  },
  permissionGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.dark.bg,
    borderRadius: 8,
    marginBottom: 8,
  },
  permissionGroupName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: Colors.dark.bg,
    borderRadius: 8,
    marginBottom: 4,
    marginLeft: 16,
  },
  permissionContent: {
    flex: 1,
    gap: 2,
  },
  permissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    fontFamily: 'monospace',
  },
  permissionDescription: {
    fontSize: 12,
    color: Colors.dark.textSecondary,
    lineHeight: 16,
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