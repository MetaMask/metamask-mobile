import { AppState, AppStateStatus } from 'react-native';
import Logger from '../../../../util/Logger';
import { MobileBackendWebSocketService } from './websocket-service-init';

/**
 * Manages WebSocket connection lifecycle based on app foreground/background state.
 * Preserves WebSocket sessions when app goes to background and resumes them when
 * app returns to foreground, avoiding session recreation.
 */
export class AppStateWebSocketManager {
  private webSocketService: MobileBackendWebSocketService | null = null;
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private currentAppState: AppStateStatus = AppState.currentState;
  private isConnected: boolean = false;
  private shouldAutoConnect: boolean = false;
  private preservedSessionId: string | null = null; // Manually preserve session ID
  private sessionDisconnectTime: number | null = null; // Track when session was disconnected

  constructor() {
    this.currentAppState = AppState.currentState;
  }

  /**
   * Initialize the manager with a WebSocket service instance
   */
  public setWebSocketService(service: MobileBackendWebSocketService) {
    this.webSocketService = service;
    this.startAppStateListener();
  }

  /**
   * Start listening to app state changes
   */
  private startAppStateListener() {
    if (this.appStateSubscription) {
      return; // Already listening
    }

    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange
    );
  }

  /**
   * Handle app state changes (active, background, inactive)
   */
  private handleAppStateChange = async (nextAppState: AppStateStatus) => {
    if (this.currentAppState === nextAppState) {
      return; // No change
    }

    const previousState = this.currentAppState;
    this.currentAppState = nextAppState;

    console.log(`[AppStateWebSocketManager] App state changed: ${previousState} -> ${nextAppState}`);

    try {
      if (nextAppState === 'active' && (previousState === 'background' || previousState === 'inactive')) {
        // App came to foreground - reconnect/resume WebSocket session
        await this.handleForeground();
      } else if (nextAppState === 'background') {
        // App went to background - disconnect but preserve session
        await this.handleBackground();
      }
      // We don't handle 'inactive' state as it's transitional
    } catch (error) {
      Logger.error(
        error as Error,
        'AppStateWebSocketManager: Error handling app state change'
      );
    }
  };

  /**
   * Check if the preserved session is still valid (within 10 minutes)
   */
  private isSessionValid(): boolean {
    if (!this.preservedSessionId || !this.sessionDisconnectTime) {
      return false;
    }
    
    const sessionRetentionMs = 600000; // 10 minutes (same as WebSocket service)
    const timeSinceDisconnect = Date.now() - this.sessionDisconnectTime;
    const isValid = timeSinceDisconnect < sessionRetentionMs;
    
    if (!isValid) {
      console.log(`[AppStateWebSocketManager] Session ${this.preservedSessionId} expired after ${Math.round(timeSinceDisconnect / 60000)} minutes`);
      this.clearPreservedSession();
    }
    
    return isValid;
  }

  /**
   * Clear the preserved session information
   */
  private clearPreservedSession() {
    const clearedSession = this.preservedSessionId;
    this.preservedSessionId = null;
    this.sessionDisconnectTime = null;
    if (clearedSession) {
      console.log(`[AppStateWebSocketManager] Cleared preserved session: ${clearedSession}`);
    }
  }

  /**
   * Handle app going to foreground - reconnect/resume WebSocket session
   */
  private async handleForeground() {
    if (!this.webSocketService) {
      return;
    }

    console.log('[AppStateWebSocketManager] App in foreground - attempting to resume WebSocket session');

    try {
      // Only reconnect if we should auto-connect
      if (this.shouldAutoConnect) {
        const hasValidSession = this.isSessionValid();
        
        if (hasValidSession && this.preservedSessionId) {
          console.log(`[AppStateWebSocketManager] 🔄 Attempting to resume session: ${this.preservedSessionId}`);
          await this.attemptSessionResumption();
        } else {
          console.log('[AppStateWebSocketManager] 🆕 Creating new WebSocket session (no valid preserved session)');
          this.clearPreservedSession();
          await this.createNewConnection();
        }
      } else {
        console.log('[AppStateWebSocketManager] Not attempting to connect - shouldAutoConnect is false');
      }
    } catch (error) {
      console.log('[AppStateWebSocketManager] Failed to resume WebSocket session:', (error as Error).message);
      this.isConnected = false;
      // Don't clear preserved session - we might be able to resume later
    }
  }

  /**
   * Attempt to resume session with retry logic
   */
  private async attemptSessionResumption() {
    if (!this.webSocketService || !this.preservedSessionId) {
      throw new Error('No WebSocket service or preserved session');
    }

    // Check if the service still has the session before connecting
    const serviceSessionId = this.getCurrentSessionId();
    console.log(`[AppStateWebSocketManager] 🔍 Service session before connect: ${serviceSessionId || 'none'}`);
    console.log(`[AppStateWebSocketManager] 🔍 Preserved session: ${this.preservedSessionId}`);

    // Attempt connection
    await this.webSocketService.connect();
    this.isConnected = true;

    // Wait a moment for session to be established
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check what session we got
    const currentSessionId = this.getCurrentSessionId();
    
    if (currentSessionId === this.preservedSessionId) {
      // Success! Session was resumed
      console.log(`[AppStateWebSocketManager] ✅ WebSocket session successfully resumed: ${currentSessionId}`);
      return;
    }

    if (currentSessionId) {
      // Got a different session - the original was probably cleared
      console.log(`[AppStateWebSocketManager] ⚠️ Expected to resume ${this.preservedSessionId} but got new session: ${currentSessionId}`);
      console.log(`[AppStateWebSocketManager] 🔧 Session was likely cleared by service state transition`);
      
      // Update our preserved session to the new one for future use
      this.preservedSessionId = currentSessionId;
      this.sessionDisconnectTime = null;
      return;
    }

    // No session ID yet - wait a bit longer for session creation
    console.log('[AppStateWebSocketManager] ⏳ Waiting for session creation...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const finalSessionId = this.getCurrentSessionId();
    if (finalSessionId) {
      console.log(`[AppStateWebSocketManager] 🆕 New WebSocket session created: ${finalSessionId}`);
      this.preservedSessionId = finalSessionId;
      this.sessionDisconnectTime = null;
    } else {
      console.log('[AppStateWebSocketManager] ⚠️ Connected but no session ID available after wait');
    }
  }

  /**
   * Create new connection (no session resumption)
   */
  private async createNewConnection() {
    if (!this.webSocketService) {
      throw new Error('No WebSocket service');
    }

    await this.webSocketService.connect();
    this.isConnected = true;

    // Wait for session creation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const sessionId = this.getCurrentSessionId();
    if (sessionId) {
      this.preservedSessionId = sessionId;
      this.sessionDisconnectTime = null;
      console.log(`[AppStateWebSocketManager] 🆕 New WebSocket session created: ${sessionId}`);
    }
  }

  /**
   * Handle app going to background - disconnect but preserve session for resumption
   */
  private async handleBackground() {
    if (!this.webSocketService) {
      return;
    }

    console.log('[AppStateWebSocketManager] App in background - preserving WebSocket session');

    try {
      if (this.isConnected) {
        // Preserve the current session ID before disconnecting
        const currentSessionId = this.getCurrentSessionId();
        if (currentSessionId) {
          this.preservedSessionId = currentSessionId;
          this.sessionDisconnectTime = Date.now();
          console.log(`[AppStateWebSocketManager] 🌙 Preserving session ID: ${this.preservedSessionId}`);
        }
        
        // Disconnect but try to preserve session (pass false to preserve session)
        await this.webSocketService.disconnect(false);
        this.isConnected = false;
        
        console.log('[AppStateWebSocketManager] WebSocket disconnected (session preserved for resumption)');
      } else {
        console.log('[AppStateWebSocketManager] WebSocket already disconnected');
      }
    } catch (error) {
      console.log('[AppStateWebSocketManager] Failed to disconnect WebSocket:', (error as Error).message);
      this.isConnected = false;
    }
  }

  /**
   * Get current session ID from WebSocket service
   */
  private getCurrentSessionId(): string | null {
    if (!this.webSocketService || typeof this.webSocketService.getSessionId !== 'function') {
      return null;
    }
    return this.webSocketService.getSessionId();
  }

  /**
   * Manually connect the WebSocket (called from initialization)
   */
  public async connect(): Promise<void> {
    if (!this.webSocketService) {
      throw new Error('WebSocket service not set');
    }

    // Only connect if app is in foreground
    if (this.currentAppState !== 'active') {
      console.log('[AppStateWebSocketManager] App not in foreground, deferring WebSocket connection');
      this.shouldAutoConnect = true;
      return;
    }

    try {
      console.log('[AppStateWebSocketManager] Connecting WebSocket...');
      await this.webSocketService.connect();
      this.isConnected = true;
      this.shouldAutoConnect = true;
      
      // Store the new session ID
      const sessionId = this.getCurrentSessionId();
      if (sessionId) {
        this.preservedSessionId = sessionId;
        this.sessionDisconnectTime = null;
        console.log(`[AppStateWebSocketManager] WebSocket connected with session: ${sessionId}`);
      }
    } catch (error) {
      this.isConnected = false;
      console.log('[AppStateWebSocketManager] Failed to connect WebSocket:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Manually disconnect the WebSocket and clear session
   */
  public async disconnect(): Promise<void> {
    if (!this.webSocketService) {
      return;
    }

    try {
      // Clear session completely (pass true to clear session)
      await this.webSocketService.disconnect(true);
      this.isConnected = false;
      this.shouldAutoConnect = false;
      this.clearPreservedSession();
      console.log('[AppStateWebSocketManager] WebSocket disconnected (session cleared)');
    } catch (error) {
      console.log('[AppStateWebSocketManager] Failed to disconnect WebSocket:', (error as Error).message);
      throw error;
    }
  }

  /**
   * Send a message through the WebSocket (only if connected and in foreground)
   */
  public async sendMessage(message: any): Promise<void> {
    if (!this.webSocketService) {
      throw new Error('WebSocket service not set');
    }

    if (this.currentAppState !== 'active') {
      throw new Error('Cannot send message when app is not in foreground');
    }

    if (!this.isConnected) {
      throw new Error('WebSocket not connected');
    }

    return this.webSocketService.sendMessage(message);
  }

  /**
   * Get current connection status including session information
   */
  public getConnectionStatus(): { 
    isConnected: boolean; 
    appState: AppStateStatus; 
    shouldAutoConnect: boolean;
    hasActiveSession: boolean;
    sessionId: string | null;
    preservedSessionId: string | null;
    sessionValidTimeRemaining: number | null;
  } {
    const currentSessionId = this.getCurrentSessionId();
    const hasActiveSession = this.isConnected && !!currentSessionId;
    
    let sessionValidTimeRemaining = null;
    if (this.preservedSessionId && this.sessionDisconnectTime) {
      const timeSinceDisconnect = Date.now() - this.sessionDisconnectTime;
      const sessionRetentionMs = 600000; // 10 minutes
      sessionValidTimeRemaining = Math.max(0, sessionRetentionMs - timeSinceDisconnect);
    }
    
    return {
      isConnected: this.isConnected,
      appState: this.currentAppState,
      shouldAutoConnect: this.shouldAutoConnect,
      hasActiveSession,
      sessionId: currentSessionId,
      preservedSessionId: this.preservedSessionId,
      sessionValidTimeRemaining,
    };
  }

  /**
   * Cleanup resources
   */
  public cleanup() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
    this.clearPreservedSession();
  }
} 