import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { WebView } from 'react-native-webview';
import { useApp } from '@/contexts/AppContext';
import Colors from '@/constants/colors';
import { User as UserIcon, Lock, Mail, ArrowRight, Globe, Edit2, Code } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { handleApiError, createApiClient } from '@/lib/api';


interface SystemSettings {
  turnstile_enabled: string;
  turnstile_key_pub: string;
  app_name: string;
}


export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [isTwoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorEmail, setTwoFactorEmail] = useState<string | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const webViewRef = useRef<WebView>(null);


  const { login, register, twoFactorVerify, isLoginLoading, isRegisterLoading, instanceUrl, savedInstances } = useApp();
  const router = useRouter();

  const {
    data: settings,
    isLoading: isSettingsLoading,
  } = useQuery<SystemSettings>({
    queryKey: ['systemSettings', instanceUrl],
    queryFn: async () => {
      if (!instanceUrl) throw new Error('No instance URL');
      const api = createApiClient(instanceUrl, '');
      const response = await api.get<any>('/api/system/settings');
      if (!response.data.success) {
        throw new Error('Failed to load settings');
      }
      return response.data.data.settings;
    },
    enabled: !!instanceUrl,
    staleTime: 30000,
    gcTime: 60000,
  });


  const turnstileEnabled = settings?.turnstile_enabled === 'true';
  const turnstileKey = settings?.turnstile_key_pub;

  const turnstileHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        html, body {
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #turnstile-container {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cf-turnstile {
          transform: scale(1.15);
          transform-origin: center center;
        }
      </style>
    </head>
    <body>
      <div id="turnstile-container">
        <div class="cf-turnstile"
          data-sitekey="${turnstileKey}"
          data-theme="dark"
          data-size="large"
          data-callback="onTurnstileSuccess"
          data-expired-callback="onTurnstileExpired"
          data-error-callback="onTurnstileError">
        </div>
      </div>


      <script>
        function onTurnstileSuccess(token) {
          window.ReactNativeWebView.postMessage('turnstile:' + token);
        }


        function onTurnstileExpired() {
          window.ReactNativeWebView.postMessage('turnstile:expired');
        }


        function onTurnstileError() {
          window.ReactNativeWebView.postMessage('turnstile:error');
        }


        window.addEventListener('message', function(event) {
          if (event.data === 'reset') {
            if (window.turnstile) {
              window.turnstile.reset('.cf-turnstile');
            }
          }
        });
      </script>
    </body>
    </html>
  `;


  const resetTurnstileWidget = () => {
    setTurnstileToken('');
    if (webViewRef.current) {
      webViewRef.current.postMessage('reset');
    }
  };


  const handleSubmit = async () => {
    if (submitLoading) return;
    setSubmitLoading(true);
    setError('');

    try {
      if (turnstileEnabled && !turnstileToken) {
        setError('Please complete Cloudflare Turnstile verification');
        resetTurnstileWidget();
        return;
      }

      if (isLogin) {
        if (!username || !password) {
          setError('Please fill in all fields');
          resetTurnstileWidget();
          return;
        }

        const credentials = {
          username_or_email: username,
          password,
          turnstile_token: turnstileEnabled ? turnstileToken : undefined,
        };

        try {
          const result = await login(credentials);
          router.replace('/(tabs)/servers');
        } catch (error: any) {
          const data = error?.response?.data;

          if (
            data &&
            !data.success &&
            data.error &&
            data.error_code === 'TWO_FACTOR_REQUIRED' &&
            data.data?.email
          ) {
            setTwoFactorRequired(true);
            setTwoFactorEmail(data.data.email);
            setTwoFactorCode('');
            return;
          }

          const msg = error?.message || 'Authentication failed';
          setError(msg);
          resetTurnstileWidget();
        }
      } else {
        if (!username || !email || !password || !firstName || !lastName) {
          setError('Please fill in all fields');
          resetTurnstileWidget();
          return;
        }

        await register({
          username,
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          turnstile_token: turnstileEnabled ? turnstileToken : undefined,
        });

        Alert.alert('Success', 'Registration successful! Please login.', [
          { text: 'OK', onPress: () => setIsLogin(true) },
        ]);
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed';
      setError(msg);
      resetTurnstileWidget();
    } finally {
      setSubmitLoading(false);
    }
  };


  const handleTwoFactorSubmit = async () => {
    if (!twoFactorEmail || !twoFactorCode.trim()) {
      setError('Please enter a 6-digit code');
      return;
    }

    try {
      await twoFactorVerify({ email: twoFactorEmail, code: twoFactorCode });
      router.replace('/(tabs)/servers');
    } catch (error: any) {
      const msg = handleApiError(error);
      setError(msg);
    }
  };


  const handleToggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setUsername('');
    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setTurnstileToken('');
    setSubmitLoading(false);
    if (webViewRef.current) {
      webViewRef.current.postMessage('reset');
    }
  };


  const isButtonLoading = submitLoading || isLoginLoading || isRegisterLoading;
  const isSettingsLoadingOnly = isSettingsLoading && !submitLoading && !isLoginLoading && !isRegisterLoading;


  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={styles.logo}
              contentFit="contain"
            />
            <Text style={styles.title}>{isLogin ? 'Welcome Back' : 'Create Account'}</Text>
            <Text style={styles.subtitle}>
              {isLogin ? 'Login to manage your servers' : 'Register to get started'}
            </Text>


            <Pressable
              style={styles.instanceUrlBadge}
              onPress={() => {
                router.push('/saved-instances');
              }}
              disabled={isButtonLoading}
            >
              <Globe size={16} color={Colors.dark.primary} />
              <Text style={styles.instanceUrlText} numberOfLines={1}>
                {instanceUrl ? new URL(instanceUrl).hostname : 'No instance'}
              </Text>
              <Edit2 size={14} color={Colors.dark.textMuted} />
            </Pressable>
          </View>


          <View style={styles.form}>
            {isTwoFactorRequired ? (
              <View style={styles.twoFactorContainer}>
                <View style={styles.twoFactorCard}>
                  <Code size={24} color={Colors.dark.primary} style={styles.twoFactorIcon} />
                  <View style={styles.twoFactorText}>
                    <Text style={styles.twoFactorTitle}>Two-Factor Authentication</Text>
                    <Text style={styles.twoFactorSubtitle}>
                      Enter the 6‑digit code from your authenticator app for:
                    </Text>
                    <Text style={styles.twoFactorEmail}>{twoFactorEmail}</Text>
                  </View>
                </View>


                <View style={styles.inputContainer}>
                  <Text style={styles.label}>2FA Code</Text>
                  <View style={styles.inputWrapper}>
                    <Code size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="123 456"
                      value={twoFactorCode}
                      onChangeText={(val) => {
                        setTwoFactorCode(val);
                      }}
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry
                    />
                  </View>
                </View>


                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}


                <TouchableOpacity
                  style={[styles.button, isButtonLoading && styles.buttonDisabled]}
                  onPress={handleTwoFactorSubmit}
                  disabled={isButtonLoading}
                >
                  {isButtonLoading ? (
                    <ActivityIndicator color={Colors.dark.text} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>Verify Code</Text>
                      <ArrowRight size={20} color={Colors.dark.text} />
                    </>
                  )}
                </TouchableOpacity>


                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={() => {
                    setError('');
                    setTwoFactorRequired(false);
                    setTwoFactorEmail(null);
                    setTwoFactorCode('');
                  }}
                >
                  <Text style={styles.switchText}>
                    <Text style={styles.switchTextBold}>Back to login</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>{isLogin ? 'Username or Email' : 'Username'}</Text>
                  <View style={styles.inputWrapper}>
                    <UserIcon size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder={isLogin ? 'username or email' : 'username'}
                      placeholderTextColor={Colors.dark.textMuted}
                      value={username}
                      onChangeText={setUsername}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isButtonLoading}
                    />
                  </View>
                </View>


                {!isLogin && (
                  <>
                    <View style={styles.inputContainer}>
                      <Text style={styles.label}>Email</Text>
                      <View style={styles.inputWrapper}>
                        <Mail size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          placeholder="email@example.com"
                          placeholderTextColor={Colors.dark.textMuted}
                          value={email}
                          onChangeText={setEmail}
                          autoCapitalize="none"
                          autoCorrect={false}
                          keyboardType="email-address"
                          editable={!isButtonLoading}
                        />
                      </View>
                    </View>


                    <View style={styles.row}>
                      <View style={[styles.inputContainer, styles.halfWidth]}>
                        <Text style={styles.label}>First Name</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            placeholder="John"
                            placeholderTextColor={Colors.dark.textMuted}
                            value={firstName}
                            onChangeText={setFirstName}
                            autoCapitalize="words"
                            editable={!isButtonLoading}
                          />
                        </View>
                      </View>


                      <View style={[styles.inputContainer, styles.halfWidth]}>
                        <Text style={styles.label}>Last Name</Text>
                        <View style={styles.inputWrapper}>
                          <TextInput
                            style={styles.input}
                            placeholder="Doe"
                            placeholderTextColor={Colors.dark.textMuted}
                            value={lastName}
                            onChangeText={setLastName}
                            autoCapitalize="words"
                            editable={!isButtonLoading}
                          />
                        </View>
                      </View>
                    </View>
                  </>
                )}


                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={20} color={Colors.dark.textMuted} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••"
                      placeholderTextColor={Colors.dark.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="go"
                      onSubmitEditing={handleSubmit}
                      editable={!isButtonLoading}
                    />
                  </View>
                </View>


                {turnstileEnabled && turnstileKey && (
                  <View style={styles.inputContainer}>
                    <View style={styles.turnstileContainer}>
                      <WebView
                        ref={webViewRef}
                        source={{ html: turnstileHtml, baseUrl: instanceUrl }}
                        style={styles.turnstileWebView}
                        onMessage={(event) => {
                          const data = event.nativeEvent.data;
                          if (data.startsWith('turnstile:')) {
                            const token = data.replace('turnstile:', '');
                            if (token === 'expired' || token === 'error') {
                              setTurnstileToken('');
                            } else {
                              setTurnstileToken(token);
                            }
                          }
                        }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        allowsInlineMediaPlayback={true}
                        mediaPlaybackRequiresUserAction={false}
                        startInLoadingState={false}
                        thirdPartyCookiesEnabled={true}
                        sharedCookiesEnabled={true}
                        originWhitelist={['*']}
                        scalesPageToFit={false}
                        scrollEnabled={false}
                        bounces={false}
                        showsVerticalScrollIndicator={false}
                        showsHorizontalScrollIndicator={false}
                        incognito={false}
                        cacheEnabled={true}
                      />
                    </View>
                  </View>
                )}


                {error ? (
                  <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}


                <TouchableOpacity
                  style={[styles.button, isButtonLoading && styles.buttonDisabled]}
                  onPress={handleSubmit}
                  disabled={isButtonLoading}
                >
                  {isButtonLoading ? (
                    <ActivityIndicator color={Colors.dark.text} />
                  ) : (
                    <>
                      <Text style={styles.buttonText}>{isLogin ? 'Login' : 'Register'}</Text>
                      <ArrowRight size={20} color={Colors.dark.text} />
                    </>
                  )}
                </TouchableOpacity>


                <TouchableOpacity
                  style={styles.switchButton}
                  onPress={handleToggleMode}
                  disabled={isButtonLoading || isSettingsLoadingOnly}
                >
                  <Text style={styles.switchText}>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <Text style={styles.switchTextBold}>
                      {isLogin ? 'Register' : 'Login'}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.bg,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
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
    fontSize: 28,
    fontWeight: '700',
    color: Colors.dark.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
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
  turnstileContainer: {
    overflow: 'hidden',
    height: 100,
    backgroundColor: 'transparent',
  },
  turnstileWebView: {
    backgroundColor: 'transparent',
  },
  errorContainer: {
    backgroundColor: Colors.dark.danger + '20',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.dark.danger + '40',
  },
  errorText: {
    color: Colors.dark.danger,
    fontSize: 14,
  },
  twoFactorContainer: {
    marginTop: 20,
    marginBottom: 20,
  },
  twoFactorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  twoFactorIcon: {
    marginRight: 12,
  },
  twoFactorText: {
    flex: 1,
  },
  twoFactorTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
    marginBottom: 4,
  },
  twoFactorSubtitle: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    marginBottom: 4,
  },
  twoFactorEmail: {
    fontSize: 14,
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: Colors.dark.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  switchButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  switchText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
  },
  switchTextBold: {
    color: Colors.dark.primary,
    fontWeight: '600',
  },
  instanceUrlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bgSecondary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    maxWidth: '100%',
  },
  instanceUrlText: {
    fontSize: 13,
    color: Colors.dark.textSecondary,
    flex: 1,
  },
});