import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Globe, Trash2, Plus, Edit2, Check, X } from 'lucide-react-native';

export default function SavedInstancesScreen() {
  const { savedInstances, deleteInstance, selectInstance, saveInstance, updateInstance, instanceUrl, authToken, clearAll } = useApp();
  const router = useRouter();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingInstance, setEditingInstance] = useState<{ id: string; name: string; url: string } | null>(null);
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');

  useEffect(() => {
    if (savedInstances.length === 0) {
      clearAll().then(() => {
        router.replace('/instance-setup');
      });
    }
  }, [savedInstances]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Instance',
      'Are you sure you want to delete this instance?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteInstance(id) },
      ]
    );
  };

  const handleSelect = (instance: { id: string; name: string; url: string }) => {
    selectInstance(instance);
    if (!authToken) {
      router.replace('/auth');
    } else {
      router.back();
    }
  };

  const handleEdit = (instance: { id: string; name: string; url: string }) => {
    setEditingInstance(instance);
    setNewName(instance.name);
    setNewUrl(instance.url);
    setIsModalVisible(true);
  };

  const handleUpdate = () => {
    if (!editingInstance || !newName.trim() || !newUrl.trim()) {
      Alert.alert('Error', 'Please enter a name and URL');
      return;
    }
    updateInstance(editingInstance.id, newName, newUrl)
      .then(() => {
        setIsModalVisible(false);
        setEditingInstance(null);
      })
      .catch(() => {
        Alert.alert('Error', 'Failed to update instance');
      });
  };

  const handleAdd = () => {
    setNewName('');
    setNewUrl('');
    setEditingInstance(null);
    setIsModalVisible(true);
  };

  const handleSave = () => {
    if (!newName.trim() || !newUrl.trim()) {
      Alert.alert('Error', 'Please enter a name and URL');
      return;
    }
    if (editingInstance) {
      handleUpdate();
    } else {
      saveInstance(newName, newUrl)
        .then(() => {
          setIsModalVisible(false);
        })
        .catch(() => {
          Alert.alert('Error', 'Failed to save instance');
        });
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Instances</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
          <Plus size={20} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={savedInstances}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.instanceCard}>
            <TouchableOpacity
              style={styles.instanceInfo}
              onPress={() => handleSelect(item)}
            >
              <Globe size={20} color={instanceUrl === item.url ? Colors.dark.primary : Colors.dark.textMuted} />
              <View style={styles.instanceText}>
                <Text style={styles.instanceName}>{item.name}</Text>
                <Text style={styles.instanceUrl}>{item.url}</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.instanceActions}>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
                <Edit2 size={20} color={Colors.dark.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)}>
                <Trash2 size={20} color={Colors.dark.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No instances found</Text>
          </View>
        }
      />

      <Modal
        visible={isModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setIsModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{editingInstance ? 'Edit Instance' : 'Add Instance'}</Text>
                <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                  <X size={24} color={Colors.dark.text} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <Text style={styles.inputLabel}>Instance Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="My Instance"
                  value={newName}
                  onChangeText={setNewName}
                  autoCapitalize="words"
                />

                <Text style={styles.inputLabel}>Instance URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="panel.example.com"
                  value={newUrl}
                  onChangeText={setNewUrl}
                  autoCapitalize="none"
                />
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.modalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSave}
                >
                  <Text style={styles.modalButtonText}>Save</Text>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.dark.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.dark.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: 16,
  },
  instanceCard: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  instanceText: {
    flex: 1,
  },
  instanceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  instanceUrl: {
    fontSize: 14,
    color: Colors.dark.textMuted,
  },
  instanceActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.dark.textMuted,
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
  },
  input: {
    backgroundColor: Colors.dark.bg,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: Colors.dark.text,
    marginBottom: 16,
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
  modalButtonSave: {
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