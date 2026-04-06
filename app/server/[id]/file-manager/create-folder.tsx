import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, FolderPlus } from 'lucide-react-native';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

export default function FolderCreateScreen() {
  const { id, path = '' } = useLocalSearchParams<{ id: string; path: string }>();
  const router = useRouter();
  const { instanceUrl, authToken } = useApp();
  const queryClient = useQueryClient();
  
  const [folderName, setFolderName] = useState('');
  const { suspended } = useServerDetails(id);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!instanceUrl || !authToken || !id || !folderName.trim()) {
        throw new Error('Missing server ID, folder name or authentication');
      }

      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(`/api/user/servers/${id}/create-directory`, {
        path: path === '/' ? '/' : path,
        name: folderName.trim()
      });

      if (response.status !== 200) {
        throw new Error(response.data?.error_message || response.data?.message || 'Failed to create folder');
      }
    },
    onSuccess: () => {
      Alert.alert('Success', `Folder "${folderName}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['server-files', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to create folder');
    }
  });

  const handleCreate = () => {
    if (!folderName.trim()) {
      Alert.alert('Error', 'Please enter a folder name');
      return;
    }
    createMutation.mutate();
  };

  const currentPathDisplay = path === '/' ? 'Root' : path.slice(1);

  if (suspended) return <SuspendedScreen onBack={() => router.back()} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <ChevronLeft size={24} color={Colors.dark.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={{ 
            color: Colors.dark.textSecondary, 
            fontSize: 14,
            marginBottom: 2
          }}>
            Create new folder in:
          </Text>
          <Text style={{ 
            color: Colors.dark.text, 
            fontSize: 16, 
            fontWeight: '600',
            fontFamily: 'monospace'
          }}>
            /{currentPathDisplay}/
          </Text>
        </View>
      </View>
      
      <View style={{ flex: 1, padding: 16, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ 
          backgroundColor: Colors.dark.bgSecondary, 
          borderRadius: 12, 
          padding: 24, 
          borderWidth: 1,
          borderColor: Colors.dark.border,
          alignItems: 'center',
          gap: 16,
          width: '100%',
          maxWidth: 400
        }}>
          <FolderPlus size={48} color={Colors.dark.primary} />
          
          <Text style={{
            color: Colors.dark.text,
            fontSize: 18,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: 8
          }}>
            New Folder
          </Text>
          
          <TextInput
            style={{
              flex: 1,
              minHeight: 48,
              backgroundColor: Colors.dark.bg,
              borderRadius: 8,
              paddingHorizontal: 16,
              paddingVertical: 12,
              fontSize: 16,
              color: Colors.dark.text,
              borderWidth: 1,
              borderColor: Colors.dark.border,
              fontFamily: 'monospace',
              textAlign: 'center'
            }}
            placeholder="Folder name"
            placeholderTextColor={Colors.dark.textMuted}
            value={folderName}
            onChangeText={setFolderName}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={handleCreate} 
          disabled={createMutation.isPending || !folderName.trim()}
          style={[
            {
              backgroundColor: Colors.dark.primary,
              paddingHorizontal: 20,
              paddingVertical: 14,
              borderRadius: 8,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            },
            (createMutation.isPending || !folderName.trim()) && { 
              opacity: 0.6,
              backgroundColor: Colors.dark.bgTertiary 
            }
          ]}
        >
          {createMutation.isPending ? (
            <>
              <ActivityIndicator size={18} color="white" />
              <Text style={{ color: 'white', fontWeight: '600' }}>Creating...</Text>
            </>
          ) : (
            <>
              <FolderPlus size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                Create Folder
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
    padding: 16, 
    backgroundColor: Colors.dark.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    alignItems: 'center'
  },
  footer: {
    padding: 16,
    backgroundColor: Colors.dark.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border
  },
});