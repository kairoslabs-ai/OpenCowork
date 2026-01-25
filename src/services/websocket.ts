// OpenCowork WebSocket Client for Real-time Updates

import type {
  WebSocketMessage,
  WebSocketEventType,
  WebSocketConfig,
} from "../types";

export type WebSocketCallback = (message: WebSocketMessage) => void;
export type WebSocketEventHandler = (data: unknown) => void;

interface PendingCallback {
  callback: WebSocketEventHandler;
  unsubscribe: () => void;
}

export class WebSocketClient {
  private socket: WebSocket | null = null;
  private url: string;
  private taskId: string;
  private reconnectAttempts: number;
  private reconnectDelay: number;
  private currentAttempt: number = 0;
  private isManualClose: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private eventHandlers: Map<WebSocketEventType, PendingCallback[]> = new Map();

  constructor(
    taskId: string,
    config: WebSocketConfig,
    private reconnectOnClose: boolean = true
  ) {
    this.taskId = taskId;
    this.url = config.url || `ws://localhost:8000/ws/tasks/${taskId}`;
    this.reconnectAttempts = config.reconnectAttempts || 5;
    this.reconnectDelay = config.reconnectDelay || 1000;
  }

  /**
   * Connect to WebSocket server
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new WebSocket(this.url);

        this.socket.onopen = () => {
          console.log(`WebSocket connected to ${this.url}`);
          this.currentAttempt = 0;
          resolve();
        };

        this.socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data) as WebSocketMessage;
            this._handleMessage(message);
          } catch (error) {
            console.error("Error parsing WebSocket message:", error);
          }
        };

        this.socket.onerror = (event) => {
          console.error("WebSocket error:", event);
          reject(new Error("WebSocket connection failed"));
        };

        this.socket.onclose = () => {
          console.log("WebSocket disconnected");
          if (this.reconnectOnClose && !this.isManualClose) {
            this._reconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming WebSocket message
   */
  private _handleMessage(message: WebSocketMessage): void {
    // Dispatch to registered event handlers
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((pending) => {
        try {
          pending.callback(message.data);
        } catch (error) {
          console.error(`Error in WebSocket handler for ${message.type}:`, error);
        }
      });
    }
  }

  /**
   * Reconnect to WebSocket with exponential backoff
   */
  private _reconnect(): void {
    if (this.currentAttempt >= this.reconnectAttempts) {
      console.error(
        `Failed to reconnect after ${this.reconnectAttempts} attempts`
      );
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.currentAttempt);
    console.log(
      `Reconnecting in ${delay}ms (attempt ${this.currentAttempt + 1}/${this.reconnectAttempts})`
    );

    this.reconnectTimer = setTimeout(() => {
      this.currentAttempt++;
      this.connect().catch((error) => {
        console.error("Reconnection failed:", error);
        if (this.currentAttempt < this.reconnectAttempts) {
          this._reconnect();
        }
      });
    }, delay);
  }

  /**
   * Send a message to server
   */
  send(data: unknown): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.warn("WebSocket not connected, cannot send message");
      return;
    }

    try {
      this.socket.send(JSON.stringify(data));
    } catch (error) {
      console.error("Error sending WebSocket message:", error);
    }
  }

  /**
   * Subscribe to a specific event type
   */
  subscribe(
    eventType: WebSocketEventType,
    callback: WebSocketEventHandler
  ): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    const unsubscribe = () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        const index = handlers.findIndex((h) => h.callback === callback);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };

    const pending: PendingCallback = { callback, unsubscribe };
    this.eventHandlers.get(eventType)!.push(pending);

    return unsubscribe;
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    this.isManualClose = true;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.eventHandlers.clear();
  }
}

/**
 * Factory function to create a WebSocket client for a task
 */
export function createWebSocketClient(
  taskId: string,
  wsUrl: string = "ws://localhost:8000"
): WebSocketClient {
  return new WebSocketClient(
    taskId,
    {
      url: `${wsUrl}/ws/tasks/${taskId}`,
      reconnectAttempts: 5,
      reconnectDelay: 1000,
    },
    true
  );
}

/**
 * Hook-friendly WebSocket manager for React
 */
export class WebSocketManager {
  private clients: Map<string, WebSocketClient> = new Map();
  private wsUrl: string;

  constructor(wsUrl: string = "ws://localhost:8000") {
    this.wsUrl = wsUrl;
  }

  /**
   * Get or create a WebSocket client for a task
   */
  getClient(taskId: string): WebSocketClient {
    if (!this.clients.has(taskId)) {
      const client = createWebSocketClient(taskId, this.wsUrl);
      this.clients.set(taskId, client);
    }

    return this.clients.get(taskId)!;
  }

  /**
   * Connect a client
   */
  async connect(taskId: string): Promise<void> {
    const client = this.getClient(taskId);
    if (!client.isConnected()) {
      await client.connect();
    }
  }

  /**
   * Disconnect a client
   */
  disconnect(taskId: string): void {
    const client = this.clients.get(taskId);
    if (client) {
      client.disconnect();
      this.clients.delete(taskId);
    }
  }

  /**
   * Disconnect all clients
   */
  disconnectAll(): void {
    this.clients.forEach((client) => client.disconnect());
    this.clients.clear();
  }
}

/**
 * Global WebSocket manager instance
 */
export const wsManager = new WebSocketManager();
