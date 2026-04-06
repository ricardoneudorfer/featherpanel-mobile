import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { createApiClient } from '@/lib/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Save } from 'lucide-react-native';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

export default function FileEditScreen() {
  const { id, path, filename, content = '' } = useLocalSearchParams<{ 
    id: string; 
    path: string; 
    filename: string; 
    content: string 
  }>();
  const router = useRouter();
  const { instanceUrl, authToken } = useApp();
  const queryClient = useQueryClient();
  const [fileContent, setFileContent] = useState('');
  const { suspended } = useServerDetails(id);

  useEffect(() => {
    try {
      const decoded = decodeURIComponent(content || '');
      setFileContent(decoded);
    } catch (e) {
      setFileContent(content || '');
    }
  }, [content]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!instanceUrl || !authToken || !id || !path) {
        throw new Error('Missing authentication or path');
      }

      const api = createApiClient(instanceUrl, authToken);
      const response = await api.post(
        `/api/user/servers/${id}/write-file`, 
        fileContent, 
        {
          params: { path: `/${path}` },
          headers: {
            'Content-Type': 'text/plain',
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(response.data?.error_message || response.data?.message || 'Failed to save file');
      }
    },
    onSuccess: () => {
      Alert.alert('Success', 'File saved successfully');
      queryClient.invalidateQueries({ queryKey: ['server-files', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Error', error?.message || 'Failed to save file');
    }
  });

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (suspended) return <SuspendedScreen onBack={() => router.back()} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <ChevronLeft size={24} color={Colors.dark.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, paddingLeft: 12 }}>
          <Text style={{ 
            color: Colors.dark.text, 
            fontSize: 18, 
            fontWeight: '600',
            fontFamily: 'monospace'
          }}>
            {filename}
          </Text>
        </View>
        <TouchableOpacity 
          onPress={handleSave} 
          disabled={saveMutation.isPending}
          style={[
            {
              flexDirection: 'row',
              backgroundColor: Colors.dark.primary,
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderRadius: 8,
              alignItems: 'center',
              gap: 6
            },
            saveMutation.isPending && { opacity: 0.6 }
          ]}
        >
          {saveMutation.isPending ? (
            <ActivityIndicator size={16} color="white" />
          ) : (
            <>
              <Save size={18} color="white" />
              <Text style={{ color: 'white', fontWeight: '600' }}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      <TextInput
        style={{
          flex: 1,
          backgroundColor: Colors.dark.bg,
          color: Colors.dark.text,
          padding: 16,
          fontFamily: 'monospace',
          fontSize: 14,
          borderTopWidth: 1,
          borderTopColor: Colors.dark.border
        }}
        multiline
        value={fileContent}
        onChangeText={setFileContent}
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
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
    flexDirection: 'row', 
    padding: 16, 
    backgroundColor: Colors.dark.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    alignItems: 'center'
  },
});