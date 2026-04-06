import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Lock, Loader, Terminal, Send, Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useApp } from '@/contexts/AppContext';
import { websocketConsoleClient } from '@/lib/websockets/console';
import { useServerDetails } from '@/hooks/useServerDetails';
import { SuspendedScreen } from '@/components/SuspendedScreen';

export default function ServerConsoleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { instanceUrl, authToken } = useApp();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState<string>('');
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const { suspended } = useServerDetails(id);

  useEffect(() => {
    
    if (!id || !instanceUrl || !authToken) {
      setIsInitializing(false);
      return;
    }

    websocketConsoleClient.setConfig(instanceUrl, authToken);
    websocketConsoleClient.setServerUuid(id as string);
    
    const loadInitialLogs = async () => {
      await websocketConsoleClient.loadFromStorage();
      const storedLines = websocketConsoleClient.getConsoleLines();
      if (storedLines.length > 0) {
        setLines(storedLines);
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
      }
    };

    loadInitialLogs();
    
    websocketConsoleClient.onOutput = (data) => {
      setLines(prev => {
        const updated = [...prev, data];
        return updated.slice(-2000);
      });
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 50);
    };

    websocketConsoleClient.onConnectionChange = (connected) => {
      setIsConnected(connected);
    };

    websocketConsoleClient.onBulkLogsComplete = () => {
      const allLines = websocketConsoleClient.getConsoleLines();
      setLines(allLines);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    };

    websocketConsoleClient.start();
    setIsInitializing(false);

    return () => {
      websocketConsoleClient.stop();
    };
  }, [id, instanceUrl, authToken]);

  const sendCommand = useCallback(() => {
    if (!input.trim() || !isConnected) {
      return;
    }
    websocketConsoleClient.sendCommand(input);
    setInput('');
    inputRef.current?.focus();
  }, [input, isConnected]);

  const handleSubmit = useCallback((e?: any) => {
    e?.preventDefault?.();
    sendCommand();
  }, [sendCommand]);

  const clearConsole = useCallback(async () => {
    setLines([]);
    await websocketConsoleClient.clearHistory();
  }, []);

  const renderLine = (line: string, index: number) => {
    if (!line.trim()) return null;

    const parts: JSX.Element[] = [];
    let remaining = line;
    let key = 0;

    while (remaining.length > 0) {
      const daemonMatch = remaining.match(/\[FeatherPanel Daemon\]:/);
      
      if (daemonMatch && daemonMatch.index !== undefined) {
        if (daemonMatch.index > 0) {
          parts.push(
            <Text key={`${index}-${key++}`} style={styles.outputText}>
              {remaining.substring(0, daemonMatch.index)}
            </Text>
          );
        }
        
        parts.push(
          <Text key={`${index}-${key++}`} style={styles.daemonText}>
            [FeatherPanel Daemon]:
          </Text>
        );
        
        remaining = remaining.substring(daemonMatch.index + daemonMatch[0].length);
      } else {
        parts.push(
          <Text key={`${index}-${key++}`} style={styles.outputText}>
            {remaining}
          </Text>
        );
        break;
      }
    }

    return (
      <View key={index} style={styles.lineWrapper}>
        <Text style={styles.outputLine}>{parts}</Text>
      </View>
    );
  };

  const isReady = !!instanceUrl && !!authToken && !!id;
  const isDisabled = !isConnected || !isReady;

  if (suspended) return <SuspendedScreen onBack={() => router.back()} />;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {!isReady ? (
            <View style={styles.headerContent}>
              <Lock size={16} color={Colors.dark.warning} />
              <Text style={styles.notReadyText}>Not authenticated</Text>
            </View>
          ) : isInitializing ? (
            <ActivityIndicator color={Colors.dark.primary} />
          ) : isConnected ? (
            <View style={styles.headerContent}>
              <View style={styles.connectedDot} />
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          ) : (
            <View style={styles.headerContent}>
              <Loader size={16} color={Colors.dark.warning} />
              <Text style={styles.disconnectedText}>Connecting...</Text>
            </View>
          )}
        </View>
        {lines.length > 0 && (
          <TouchableOpacity onPress={clearConsole} style={styles.clearButton}>
            <Trash2 size={18} color={Colors.dark.danger} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.consoleContainer}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.logsScroll}
          contentContainerStyle={styles.logsContent}
        >
          {lines.length > 0 ? (
            <View>{lines.map((line, index) => renderLine(line, index))}</View>
          ) : (
            <View style={styles.emptyState}>
              {!isReady ? (
                <>
                  <Lock size={48} color={Colors.dark.textMuted} />
                  <Text style={styles.emptyTitle}>Login Required</Text>
                  <Text style={styles.emptyDescription}>Please login to access the console</Text>
                </>
              ) : !isConnected ? (
                <>
                  <Loader size={48} color={Colors.dark.textMuted} />
                  <Text style={styles.emptyTitle}>Connecting...</Text>
                  <Text style={styles.emptyDescription}>Establishing connection to server console</Text>
                </>
              ) : (
                <>
                  <Terminal size={48} color={Colors.dark.textMuted} />
                  <Text style={styles.emptyTitle}>Console Empty</Text>
                  <Text style={styles.emptyDescription}>No output yet. Start your server for the best experience.</Text>
                  <Text style={styles.emptyHint}>Commands will appear here once the server is running</Text>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[styles.input, isDisabled && styles.inputDisabled]}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          placeholder={isReady ? (isConnected ? "Enter command..." : "Connecting...") : "Login required"}
          placeholderTextColor={Colors.dark.textMuted}
          editable={!isDisabled}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, (isDisabled || !input.trim()) && styles.sendButtonDisabled]}
          onPress={handleSubmit}
          disabled={isDisabled || !input.trim()}
        >
          <Send size={18} color="#fff" />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 8,
  },
  connectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF00',
  },
  notReadyText: {
    fontSize: 16,
    color: Colors.dark.warning,
    fontWeight: '700',
  },
  connectedText: {
    fontSize: 16,
    color: '#00FF00',
    fontWeight: '700',
  },
  disconnectedText: {
    fontSize: 16,
    color: Colors.dark.warning,
    fontWeight: '700',
  },
  consoleContainer: {
    flex: 1,
    margin: 16,
    marginTop: 0,
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    overflow: 'hidden',
  },
  logsScroll: {
    flex: 1,
  },
  logsContent: {
    padding: 12,
    flexGrow: 1,
  },
  lineWrapper: {
    marginBottom: 4,
  },
  outputLine: {
    fontSize: 14,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 20,
  },
  outputText: {
    fontSize: 14,
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  daemonText: {
    fontSize: 14,
    color: '#FFD700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    color: Colors.dark.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: Colors.dark.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyHint: {
    fontSize: 12,
    color: Colors.dark.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: Colors.dark.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#FFF',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  inputDisabled: {
    color: Colors.dark.textMuted,
    backgroundColor: Colors.dark.bgSecondary,
    borderColor: Colors.dark.danger,
  },
  sendButton: {
    backgroundColor: Colors.dark.primary,
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.dark.danger,
    opacity: 0.6,
  },
});