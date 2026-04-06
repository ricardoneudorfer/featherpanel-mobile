import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { Server, ArrowRight, Lock, Globe } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

export default function InstanceSetupScreen() {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [useHttps, setUseHttps] = useState(true);
  const [error, setError] = useState('');
  const { saveInstance, setInstanceUrl } = useApp();
  const router = useRouter();

  const validateUrl = (input: string): boolean => {
    try {
      const urlObj = new URL(input);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleSaveAndContinue = async () => {
    setError('');

    if (!name.trim() || !url.trim()) {
      setError('Please enter a name and URL');
      return;
    }

    let cleanUrl = url.trim();

    if (!cleanUrl.includes('://')) {
      const protocol = useHttps ? 'https://' : 'http://';
      cleanUrl = `${protocol}${cleanUrl}`;
    }

    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }

    if (!validateUrl(cleanUrl)) {
      setError('Please enter a valid URL');
      return;
    }

    try {
      await saveInstance(name, cleanUrl);
      await setInstanceUrl(cleanUrl);
      router.replace('/auth');
    } catch (error) {
      setError('Failed to save instance');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.title}>Add New Instance</Text>
            <Text style={styles.subtitle}>
              Enter a name and URL for your FeatherPanel instance
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Instance Name</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  placeholder="My FeatherPanel"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Instance URL</Text>
              <View style={styles.inputWrapper}>
                <Server size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="panel.example.com"
                  placeholderTextColor={Colors.dark.textMuted}
                  value={url}
                  onChangeText={setUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            <View style={styles.protocolSection}>
              <Text style={styles.protocolLabel}>Protocol</Text>
              <Text style={styles.protocolDescription}>Tap to toggle between HTTP/HTTPS</Text>
              <TouchableOpacity
                style={[
                  styles.protocolToggle,
                  useHttps && styles.protocolToggleActive
                ]}
                onPress={() => setUseHttps(!useHttps)}
                activeOpacity={0.7}
              >
                <View style={styles.protocolContent}>
                  <View style={[
                    styles.protocolIcon,
                    useHttps ? styles.httpsIcon : styles.httpIcon
                  ]}>
                    {useHttps ? <Lock size={18} color={Colors.dark.primary} /> : <Globe size={18} color={Colors.dark.textMuted} />}
                  </View>
                  <Text style={[
                    styles.protocolText,
                    useHttps ? styles.protocolTextActive : styles.protocolTextInactive
                  ]}>
                    {useHttps ? 'https:// (recommended)' : 'http://'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSaveAndContinue}
              testID="save-instance-button"
            >
              <Text style={styles.buttonText}>Save and Continue</Text>
              <ArrowRight size={20} color={Colors.dark.text} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: Colors.dark.text,
  },
  errorText: {
    color: Colors.dark.danger,
    fontSize: 14,
    marginTop: 8,
  },
  protocolSection: {
    marginBottom: 24,
  },
  protocolLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  protocolDescription: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 12,
  },
  protocolToggle: {
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    padding: 16,
  },
  protocolToggleActive: {
    backgroundColor: Colors.dark.primary + '10',
    borderColor: Colors.dark.primary,
  },
  protocolContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  protocolIcon: {
    marginRight: 12,
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  httpsIcon: {
    backgroundColor: Colors.dark.primary + '20',
  },
  httpIcon: {
    backgroundColor: Colors.dark.textMuted + '20',
  },
  protocolText: {
    fontSize: 16,
    fontWeight: '500',
  },
  protocolTextActive: {
    color: Colors.dark.primary,
  },
  protocolTextInactive: {
    color: Colors.dark.textMuted,
  },
  button: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginTop: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
});