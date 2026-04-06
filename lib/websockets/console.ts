import AsyncStorage from '@react-native-async-storage/async-storage';
import { createApiClient } from '../api';
import { ApiEnvelope } from '@/types/api';

interface ConsoleMessage {
  event: 'console output' | 'status' | 'stats' | 'jwt error' | 'auth success' | 'token expiring' | 'token expired' | 'send stats' | 'send logs';
  args: string[];
}

interface JwtResponseData {
  token: string;
  connection_string: string;
  expires_at?: number;
  server_uuid?: string;
  user_uuid?: string;
  permissions?: string[];
}

let INSTANCE_URL: string = '';
const MAX_CONSOLE_LINES = 2000;

export class ConsoleClient {
  private apiClient?: ReturnType<typeof createApiClient>;
  private ws: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private keepAliveInterval: NodeJS.Timeout | null = null;
  private isNode = typeof window === 'undefined';
  private currentToken: string | null = null;
  private serverUuid: string | null = null;
  private messageBuffer: string = '';
  private consoleLines: string[] = [];
  private saveDebounceTimeout: NodeJS.Timeout | null = null;
  public onOutput?: (data: string) => void;
  public onConnectionChange?: (connected: boolean) => void;
  public onStats?: (stats: any) => void;
  public onHistoryLoaded?: (lines: string[]) => void;
  public isReady = false;

  setConfig(instanceUrl: string, authToken: string) {
    INSTANCE_URL = instanceUrl;
    this.apiClient = createApiClient(instanceUrl, authToken);
    this.isReady = true;
  }

  setServerUuid(uuid: string) {
    this.serverUuid = uuid;
  }

  private getStorageKey(): string {
    return `console_history_${this.serverUuid}`;
  }

  private debouncedSave(): void {
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
    }
    this.saveDebounceTimeout = setTimeout(() => {
      this.saveToStorage();
    }, 1000);
  }

  private async saveToStorage(): Promise<void> {
    if (!this.serverUuid) return;
    
    try {
      const linesToSave = this.consoleLines.slice(-MAX_CONSOLE_LINES);
      await AsyncStorage.setItem(this.getStorageKey(), JSON.stringify(linesToSave));
    } catch (err) {}
  }

  public async loadFromStorage(): Promise<void> {
    if (!this.serverUuid) return;
    
    try {
      const stored = await AsyncStorage.getItem(this.getStorageKey());
      if (stored) {
        this.consoleLines = JSON.parse(stored);
        this.onHistoryLoaded?.(this.consoleLines);
      }
    } catch (err) {
      this.consoleLines = [];
    }
  }

  public async clearHistory(): Promise<void> {
    if (!this.serverUuid) return;
    
    try {
      this.consoleLines = [];
      await AsyncStorage.removeItem(this.getStorageKey());
    } catch (err) {}
  }

  public getConsoleLines(): string[] {
    return [...this.consoleLines];
  }

  private stripAnsiCodes(text: string): string {
    return text.replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '');
  }

  private parseMessages(rawData: string): void {
    this.messageBuffer += rawData;

    while (this.messageBuffer.length > 0) {
      const trimmed = this.messageBuffer.trim();
      
      if (trimmed.startsWith('{')) {
        const closeBraceIndex = trimmed.indexOf('}');
        if (closeBraceIndex === -1) {
          break;
        }
        
        const potentialJson = trimmed.substring(0, closeBraceIndex + 1);
        try {
          const message: ConsoleMessage = JSON.parse(potentialJson);
          this.handleMessage(message);
          this.messageBuffer = this.messageBuffer.substring(
            this.messageBuffer.indexOf(potentialJson) + potentialJson.length
          );
          continue;
        } catch (err) {}
      }

      const newlineIndex = this.messageBuffer.indexOf('\n');
      
      if (newlineIndex === -1) {
        break;
      }

      const lengthStr = this.messageBuffer.substring(0, newlineIndex).trim();
      const messageLength = parseInt(lengthStr, 10);

      if (isNaN(messageLength)) {
        this.messageBuffer = this.messageBuffer.substring(newlineIndex + 1);
        continue;
      }

      const messageStart = newlineIndex + 1;
      const messageEnd = messageStart + messageLength;

      if (this.messageBuffer.length < messageEnd) {
        break;
      }

      const messageJson = this.messageBuffer.substring(messageStart, messageEnd);
      this.messageBuffer = this.messageBuffer.substring(messageEnd);

      try {
        const message: ConsoleMessage = JSON.parse(messageJson);
        this.handleMessage(message);
      } catch (parseErr) {}
    }
  }

  private handleMessage(message: ConsoleMessage): void {
    if (message.event === 'auth success') {
      this.onConnectionChange?.(true);
    } else if (message.event === 'console output' && message.args.length > 0) {
      const output = this.stripAnsiCodes(message.args[0]);
      
      this.consoleLines.push(output);
      if (this.consoleLines.length > MAX_CONSOLE_LINES) {
        this.consoleLines.shift();
      }
      
      this.debouncedSave();
      
      if (this.isNode) {
        process.stdout.write(output + '\n');
      } else {
        this.onOutput?.(output);
      }
    } else if (message.event === 'stats' && message.args.length > 0) {
      try {
        const stats = JSON.parse(message.args[0]);
        this.onStats?.(stats);
      } catch (err) {}
    } else if (message.event === 'jwt error') {
      this.onConnectionChange?.(false);
      this.scheduleReconnect();
    } else if (message.event === 'send stats') {
      this.ws?.send(JSON.stringify({ event: 'send stats', args: [] }));
    } else if (message.event === 'send logs') {
      this.ws?.send(JSON.stringify({ event: 'send logs', args: [] }));
    }
  }

  private async fetchJwt(): Promise<{ url: string; token: string; serverUuid: string } | null> {
    if (!this.apiClient || !this.isReady || !this.serverUuid) {
      return null;
    }
    
    const jwtEndpoint = `${INSTANCE_URL}/api/user/servers/${this.serverUuid}/jwt`;
    
    try {
      const response = await this.apiClient.post<ApiEnvelope<JwtResponseData>>(jwtEndpoint, {});
      
      if (response.data.success && response.data.data) {
        const data = response.data.data;
        
        if (!data.connection_string || !data.token || !data.server_uuid) {
          return null;
        }

        let url = data.connection_string;
        const token = data.token;
        const serverUuid = data.server_uuid;
        
        url = url.replace(/\\\\/g, '');
        
        return { url, token, serverUuid };
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  private connect(url: string, token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      this.ws = new WebSocket(url, undefined, {
        headers: {
          'Origin': INSTANCE_URL
        }
      });
      this.currentToken = token;
      this.messageBuffer = '';

      this.ws.onopen = () => {
        this.clearReconnect();
        
        const authMessage = JSON.stringify({
          event: 'auth',
          args: [this.currentToken]
        });
        this.ws?.send(authMessage);
      };

      this.ws.onmessage = (event) => {
        this.parseMessages(event.data);
      };

      this.ws.onclose = (event) => {
        this.onConnectionChange?.(false);
        this.messageBuffer = '';
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        this.onConnectionChange?.(false);
      };
    } catch (err) {}
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      return;
    }
    this.reconnectTimeout = setTimeout(async () => {
      this.reconnectTimeout = null;
      const data = await this.fetchJwt();
      if (data) {
        this.connect(data.url, data.token);
      }
    }, 5000);
  }

  private clearReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  private startKeepAlive(): void {
    if (this.keepAliveInterval) {
      return;
    }
    this.keepAliveInterval = setInterval(async () => {
      if (!this.isConnected && this.isReady && this.serverUuid) {
        const data = await this.fetchJwt();
        if (data) {
          this.connect(data.url, data.token);
        }
      }
    }, 10000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  public async start(): Promise<void> {
    if (!this.isReady || !this.serverUuid) {
      return;
    }
    
    await this.loadFromStorage();
    
    const data = await this.fetchJwt();
    if (data) {
      this.connect(data.url, data.token);
    }
    this.startKeepAlive();
  }

  public stop(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.messageBuffer = '';
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
      this.saveDebounceTimeout = null;
    }
    this.clearReconnect();
    this.stopKeepAlive();
  }

  public sendCommand(command: string): void {
    if (!this.isConnected || !command.trim()) {
      return;
    }
    try {
      this.ws?.send(JSON.stringify({
        event: 'send command',
        args: [command]
      }));
    } catch (err) {}
  }

  public get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const websocketConsoleClient = new ConsoleClient();