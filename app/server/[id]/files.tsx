import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import { Folder, FileText, RefreshCw, Eye, Plus, FolderPlus, ChevronLeft, MoreVertical } from 'lucide-react-native';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number | null;
  modified_at: string;
  path: string;
}

const NON_EDITABLE_EXTENSIONS = [
  '.jar', '.zip', '.tar', '.gz', '.7z', '.rar', '.bz2', '.xz', '.tgz',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.class', '.pyc', '.o', '.a', '.lib',
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.tiff', '.psd', '.ai',
  '.mp3', '.mp4', '.avi', '.mov', '.wav', '.flac', '.ogg', '.mkv', '.wmv', '.m4a',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
  '.db', '.sqlite', '.sqlite3', '.mdb', '.accdb',
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  '.iso', '.dmg', '.img', '.vdi', '.vmdk',
  '.deb', '.rpm', '.apk', '.msi', '.pkg'
];

export default function ServerFilesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { instanceUrl, authToken } = useApp();
  const queryClient = useQueryClient();
  const [currentPath, setCurrentPath] = useState('/');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const { suspended } = useServerDetails(id);

  const isFileEditable = (filename: string): boolean => {
    const lowerName = filename.toLowerCase();
    return !NON_EDITABLE_EXTENSIONS.some(ext => lowerName.endsWith(ext));
  };

  const {
    data: apiResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['server-files', id, currentPath, instanceUrl, authToken],
    queryFn: async () => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }

      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/files`, {
        params: { path: currentPath }
      });

      if (response.status !== 200) {
        const message = response.data?.error_message || response.data?.message || 'Failed to fetch files';
        throw new Error(message);
      }

      return response.data;
    },
    enabled: !!instanceUrl && !!authToken && !!id,
    retry: false,
    refetchInterval: 1000,
    staleTime: 0,
  });

  const files: FileItem[] = apiResponse?.data?.contents?.map((item: any) => ({
    name: item.name,
    type: item.directory ? 'directory' : 'file',
    size: item.directory ? null : item.size,
    modified_at: item.modified,
    path: currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`,
  })) || [];

  const deleteMutation = useMutation({
    mutationFn: async (file: FileItem) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }

      const api = createApiClient(instanceUrl, authToken);
      await api.delete(`/api/user/servers/${id}/delete-files`, {
        data: {
          files: [file.path],
          root: currentPath,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['server-files', id, currentPath] });
    },
  });

  const readFileMutation = useMutation({
    mutationFn: async (file: FileItem) => {
      if (!instanceUrl || !authToken || !id) {
        throw new Error('Missing instanceUrl, authToken or server ID');
      }

      if (!isFileEditable(file.name)) {
        throw new Error('This file type cannot be edited in the mobile app');
      }

      const api = createApiClient(instanceUrl, authToken);
      const response = await api.get(`/api/user/servers/${id}/file`, {
        params: { path: file.path }
      });

      if (response.status !== 200) {
        throw new Error(response.data?.error_message || response.data?.message || 'Failed to read file');
      }

      const content = response.data;
      return { content, file };
    },
    onSuccess: ({ content, file }) => {
      router.push({
        pathname: `/server/${id}/file-manager/edit`,
        params: { 
          id, 
          path: file.path.slice(1), 
          filename: file.name,
          content: encodeURIComponent(content || '')
        }
      });
    },
    onError: (error: any) => {
      if (error?.message?.includes('cannot be edited')) {
        Alert.alert(
          'Cannot Edit File',
          'Binary files and archives cannot be edited on mobile. Use the web interface to manage this file.',
          [
            { text: 'OK', style: 'cancel' },
            { 
              text: 'Open Web', 
              onPress: async () => {
                const webUrl = `${instanceUrl}/server/${id}/files`;
                try {
                  const supported = await Linking.canOpenURL(webUrl);
                  if (supported) {
                    await Linking.openURL(webUrl);
                  }
                } catch {}
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', error?.message || 'Failed to load file content');
      }
    }
  });

  const showWebOnlyAlert = (name: string, features: string) => {
    Alert.alert(
      `${name}`,
      `${features} are only available in the web version right now.\n\nOpen web interface?`,
      [
        { text: 'No', style: 'cancel' },
        { 
          text: 'Yes, Open Web', 
          onPress: async () => {
            const webUrl = `${instanceUrl}/server/${id}/files`;
            try {
              const supported = await Linking.canOpenURL(webUrl);
              if (supported) {
                await Linking.openURL(webUrl);
              } else {
                Alert.alert('Web URL', webUrl);
              }
            } catch (error) {
              Alert.alert('Web URL', webUrl);
            }
          }
        }
      ]
    );
  };

  const handleMenuPress = (file: FileItem) => {
    setSelectedFile(file);
    if (file.type === 'directory') {
      Alert.alert(
        'Folder Options',
        'Choose an action for this folder:',
        [
          {
            text: 'Open',
            onPress: () => setCurrentPath(file.path)
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Folder',
                `Are you sure you want to delete ${file.name}?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { 
                    text: 'Delete', 
                    style: 'destructive',
                    onPress: () => deleteMutation.mutate(file)
                  },
                ]
              );
            }
          },
          {
            text: 'Rename/Move → Web',
            onPress: () => showWebOnlyAlert(file.name, 'Rename, Copy, Move, Permissions')
          }
        ],
        { cancelable: true }
      );
    } else {
      const canEdit = isFileEditable(file.name);
      const actions = [];

      if (canEdit) {
        actions.push({
          text: 'Edit',
          onPress: () => readFileMutation.mutate(file)
        });
      } else {
        actions.push({
          text: 'Cannot Edit (Binary)',
          onPress: () => {
            Alert.alert(
              'Cannot Edit',
              'This file type cannot be edited on mobile. Use the web interface.',
              [{ text: 'OK' }]
            );
          }
        });
      }

      actions.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete File',
            `Are you sure you want to delete ${file.name}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Delete', 
                style: 'destructive',
                onPress: () => deleteMutation.mutate(file)
              },
            ]
          );
        }
      });

      actions.push({
        text: 'Rename/Copy → Web',
        onPress: () => showWebOnlyAlert(file.name, 'Rename, Copy, Move, Permissions')
      });

      Alert.alert('File Options', 'Choose an action for this file:', actions, { cancelable: true });
    }
  };

  const goBack = useCallback(() => {
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.length === 0 ? '/' : '/' + parts.join('/');
    setCurrentPath(newPath);
  }, [currentPath]);

  const filteredFiles = files.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const showEmptyState = filteredFiles.length === 0 && !isLoading && !error;

  if (suspended) return <SuspendedScreen onBack={() => router.back()} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.pathContainer}>
          {currentPath !== '/' && (
            <TouchableOpacity style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.currentPath}>{currentPath}</Text>
        </View>
        
        <View style={styles.actionContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search files..."
            placeholderTextColor={Colors.dark.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.iconButton} onPress={() => refetch()}>
            <RefreshCw size={20} color={Colors.dark.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push({
              pathname: `/server/${id}/file-manager/create`,
              params: { path: currentPath }
            })}
          >
            <Plus size={20} color={Colors.dark.primary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.iconButton}
            onPress={() => router.push({
              pathname: `/server/${id}/file-manager/create-folder`,
              params: { path: currentPath }
            })}
          >
            <FolderPlus size={20} color={Colors.dark.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.dark.primary} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load files{'\n'}{error.message}</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : showEmptyState ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No files found</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFiles}
          keyExtractor={(item, index) => `${item.path}-${index}`}
          renderItem={({ item }) => {
            const canEdit = item.type === 'file' && isFileEditable(item.name);
            return (
              <View style={styles.fileRow}>
                <TouchableOpacity
                  style={styles.fileMain}
                  onPress={() => {
                    if (item.type === 'directory') {
                      setCurrentPath(item.path);
                    } else if (canEdit) {
                      readFileMutation.mutate(item);
                    } else {
                      Alert.alert(
                        'Cannot Edit',
                        'This file type cannot be edited on mobile. Use the web interface.',
                        [{ text: 'OK' }]
                      );
                    }
                  }}
                >
                  <View style={styles.fileIcon}>
                    {item.type === 'directory' ? (
                      <Folder size={24} color={Colors.dark.primary} />
                    ) : (
                      <View style={styles.fileIconContainer}>
                        <FileText size={20} color={Colors.dark.textSecondary} />
                        {canEdit && (
                          <Eye size={16} color={Colors.dark.primary} style={styles.editIcon} />
                        )}
                      </View>
                    )}
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.menuButton}
                  onPress={() => handleMenuPress(item)}
                >
                  <MoreVertical size={20} color={Colors.dark.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          }}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            searchQuery ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No files match your search</Text>
              </View>
            ) : null
          }
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
    padding: 16,
    backgroundColor: Colors.dark.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  pathContainer: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
    gap: 8,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.dark.bg,
  },
  backButtonText: {
    color: Colors.dark.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  currentPath: {
    flex: 1,
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontFamily: 'monospace',
  },
  actionContainer: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.dark.text,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  iconButton: {
    width: 44,
    height: 44,
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
    padding: 20,
  },
  errorText: {
    color: Colors.dark.danger,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.dark.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  fileRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  fileMain: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  fileIcon: {
    marginRight: 12,
  },
  fileIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.dark.bgTertiary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  editIcon: {
    position: 'absolute',
    bottom: -2,
    right: -2,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.dark.text,
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 13,
    color: Colors.dark.textMuted,
  },
  menuButton: {
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    padding: 40,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  emptyText: {
    color: Colors.dark.textMuted,
    fontSize: 16,
  },
});