import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Plus, FileText } from 'lucide-react-native';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

export default function FileCreateScreen() {
  const { id, path = '' } = useLocalSearchParams<{ id: string; path: string }>();
  const router = useRouter();
  const { instanceUrl, authToken } = useApp();
  const queryClient = useQueryClient();
  
  const [filename, setFilename] = useState('');
  const [fileContent, setFileContent] = useState('');
  const { suspended } = useServerDetails(id);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!instanceUrl || !authToken || !id || !filename.trim()) {
        throw new Error('Missing server ID, filename or authentication');
      }

      const fullPath = path && path !== '/' ? `${path}/${filename.trim()}` : filename.trim();
      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(
        `/api/user/servers/${id}/write-file`, 
        fileContent || '', 
        {
          params: { path: `/${fullPath}` },
          headers: {
            'Content-Type': 'text/plain',
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(response.data?.error_message || response.data?.message || 'Failed to create file');
      }
    },
    onMutate: () => {},
    onSuccess: () => {
      Alert.alert('Success', `File "${filename}" created successfully!`);
      queryClient.invalidateQueries({ queryKey: ['server-files', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to create file');
    }
  });

  const handleSave = () => {
    if (!filename.trim()) {
      Alert.alert('Error', 'Please enter a filename');
      return;
    }
    saveMutation.mutate();
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
            Create new file in:
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
      
      <View style={{ flex: 1, padding: 16, gap: 20 }}>
        <View>
          <Text style={{
            color: Colors.dark.text,
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8
          }}>
            Filename
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TextInput
              style={{
                flex: 1,
                backgroundColor: Colors.dark.bg,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 12,
                fontSize: 16,
                color: Colors.dark.text,
                borderWidth: 1,
                borderColor: Colors.dark.border,
                fontFamily: 'monospace'
              }}
              placeholder="filename.txt"
              placeholderTextColor={Colors.dark.textMuted}
              value={filename}
              onChangeText={setFilename}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <FileText size={24} color={Colors.dark.primary} />
          </View>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{
            color: Colors.dark.text,
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8
          }}>
            Content (optional)
          </Text>
          <TextInput
            style={{
              flex: 1,
              backgroundColor: Colors.dark.bg,
              borderRadius: 8,
              padding: 12,
              fontSize: 14,
              color: Colors.dark.text,
              fontFamily: 'monospace',
              borderWidth: 1,
              borderColor: Colors.dark.border,
              textAlignVertical: 'top'
            }}
            multiline
            placeholder="File content (leave empty for empty file)..."
            placeholderTextColor={Colors.dark.textMuted}
            value={fileContent}
            onChangeText={setFileContent}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={saveMutation.isPending || !filename.trim()}
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
            (saveMutation.isPending || !filename.trim()) && { 
              opacity: 0.6,
              backgroundColor: Colors.dark.bgTertiary 
            }
          ]}
        >
          {saveMutation.isPending ? (
            <>
              <ActivityIndicator size={18} color="white" />
              <Text style={{ color: 'white', fontWeight: '600' }}>Creating...</Text>
            </>
          ) : (
            <>
              <Plus size={20} color="white" />
              <Text style={{ color: 'white', fontWeight: '600', fontSize: 16 }}>
                Create File
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