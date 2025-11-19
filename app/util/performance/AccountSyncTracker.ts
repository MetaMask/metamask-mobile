/**
 * AccountSyncTracker - Centralized performance tracking for account sync operations
 * 
 * Silently collects timing and data measurements for all account sync phases.
 * Provides on-demand reporting instead of flooding the console with logs.
 */

export interface PhaseData {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  data?: Record<string, any>;
  status: 'pending' | 'completed' | 'error';
  error?: string;
}

export interface ControllerData extends PhaseData {
  controller: string;
}

export interface AccountSyncSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  totalDuration?: number;
  phases: {
    accountSelectorOpen?: PhaseData;
    selectorRecompute?: PhaseData;
    getAccountsHook?: PhaseData;
    ensLookups?: PhaseData;
    tokenRefresh?: {
      overall?: PhaseData;
      controllers?: ControllerData[];
    };
  };
  persistenceStats?: {
    updateCount: number;
    totalTime: number;
    avgPerUpdate: number;
  };
}

class AccountSyncTrackerClass {
  private currentSession: AccountSyncSession | null = null;
  private sessions: AccountSyncSession[] = [];
  private maxSessions = 10; // Keep last 10 sessions

  /**
   * Start a new account sync session
   */
  startSession(sessionId: string = `session_${Date.now()}`): void {
    this.currentSession = {
      sessionId,
      startTime: performance.now(),
      phases: {},
    };
  }

  /**
   * End the current session
   */
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = performance.now();
      this.currentSession.totalDuration = 
        this.currentSession.endTime - this.currentSession.startTime;
      
      // Store session in history
      this.sessions.push(this.currentSession);
      if (this.sessions.length > this.maxSessions) {
        this.sessions.shift(); // Remove oldest
      }
      
      this.currentSession = null;
    }
  }

  /**
   * Start tracking a phase
   */
  startPhase(phaseName: keyof AccountSyncSession['phases'], data?: Record<string, any>): void {
    if (!this.currentSession) {
      this.startSession();
    }
    
    if (this.currentSession) {
      const phase: PhaseData = {
        name: phaseName,
        startTime: performance.now(),
        status: 'pending',
        data,
      };
      
      if (phaseName === 'tokenRefresh') {
        this.currentSession.phases.tokenRefresh = {
          overall: phase,
          controllers: [],
        };
      } else {
        this.currentSession.phases[phaseName] = phase;
      }
    }
  }

  /**
   * End tracking a phase
   */
  endPhase(phaseName: keyof AccountSyncSession['phases'], data?: Record<string, any>): void {
    if (!this.currentSession) return;

    const phase = phaseName === 'tokenRefresh' 
      ? this.currentSession.phases.tokenRefresh?.overall
      : this.currentSession.phases[phaseName];
    
    if (phase) {
      phase.endTime = performance.now();
      phase.duration = phase.endTime - phase.startTime;
      phase.status = 'completed';
      if (data) {
        phase.data = { ...phase.data, ...data };
      }
    }
  }

  /**
   * Track a controller operation within token refresh
   */
  startController(controllerName: string, data?: Record<string, any>): void {
    if (!this.currentSession?.phases.tokenRefresh) {
      this.startPhase('tokenRefresh');
    }

    const controller: ControllerData = {
      name: controllerName,
      controller: controllerName,
      startTime: performance.now(),
      status: 'pending',
      data,
    };

    this.currentSession?.phases.tokenRefresh?.controllers?.push(controller);
  }

  /**
   * End tracking a controller operation
   */
  endController(controllerName: string, data?: Record<string, any>): void {
    if (!this.currentSession?.phases.tokenRefresh?.controllers) return;

    const controller = this.currentSession.phases.tokenRefresh.controllers
      .find(c => c.controller === controllerName && c.status === 'pending');
    
    if (controller) {
      controller.endTime = performance.now();
      controller.duration = controller.endTime - controller.startTime;
      controller.status = 'completed';
      if (data) {
        controller.data = { ...controller.data, ...data };
      }
    }
  }

  /**
   * Mark a phase as errored
   */
  errorPhase(phaseName: keyof AccountSyncSession['phases'], error: string): void {
    if (!this.currentSession) return;

    const phase = phaseName === 'tokenRefresh' 
      ? this.currentSession.phases.tokenRefresh?.overall
      : this.currentSession.phases[phaseName];
    
    if (phase) {
      phase.endTime = performance.now();
      phase.duration = phase.endTime - phase.startTime;
      phase.status = 'error';
      phase.error = error;
    }
  }

  /**
   * Update persistence stats
   */
  updatePersistenceStats(stats: { updateCount: number; totalTime: number; avgPerUpdate: number }): void {
    if (this.currentSession) {
      this.currentSession.persistenceStats = stats;
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): AccountSyncSession | null {
    return this.currentSession;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): AccountSyncSession[] {
    return this.sessions;
  }

  /**
   * Get the most recent completed session
   */
  getLastCompletedSession(): AccountSyncSession | null {
    const completedSessions = this.sessions.filter(s => s.endTime);
    return completedSessions[completedSessions.length - 1] || null;
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.currentSession = null;
    this.sessions = [];
  }

  /**
   * Generate a formatted report with analysis
   */
  generateReport(): string {
    const session = this.currentSession || this.getLastCompletedSession();
    
    if (!session) {
      return '📊 ACCOUNT SYNC PERFORMANCE REPORT\n\nNo data collected yet. Open the account selector to start tracking.';
    }

    const isCompleted = !!session.endTime;
    const totalTime = isCompleted 
      ? session.totalDuration!
      : (performance.now() - session.startTime);

    // Collect all operations with timings
    const operations: Array<{ name: string; time: number; data?: Record<string, any> }> = [];

    if (session.phases.selectorRecompute?.duration) {
      operations.push({
        name: 'Selector Recompute',
        time: session.phases.selectorRecompute.duration,
        data: session.phases.selectorRecompute.data,
      });
    }

    if (session.phases.getAccountsHook?.duration) {
      operations.push({
        name: 'Get Accounts Hook',
        time: session.phases.getAccountsHook.duration,
        data: session.phases.getAccountsHook.data,
      });
    }

    if (session.phases.ensLookups?.duration) {
      operations.push({
        name: 'ENS Lookups',
        time: session.phases.ensLookups.duration,
        data: session.phases.ensLookups.data,
      });
    }

    // Add controller operations
    if (session.phases.tokenRefresh?.controllers) {
      session.phases.tokenRefresh.controllers.forEach(controller => {
        if (controller.duration) {
          operations.push({
            name: controller.controller,
            time: controller.duration,
            data: controller.data,
          });
        }
      });
    }

    // Sort by time (slowest first)
    operations.sort((a, b) => b.time - a.time);

    // Build report
    let report = '📊 ACCOUNT SYNC PERFORMANCE REPORT\n\n';
    report += `Status: ${isCompleted ? '✅ Completed' : '⏳ In Progress'}\n`;
    report += `Total Time: ${totalTime.toFixed(2)}ms\n\n`;

    // Summary - Top 3 slowest
    if (operations.length > 0) {
      report += '🔥 SLOWEST OPERATIONS (Top 3)\n\n';
      operations.slice(0, 3).forEach((op, index) => {
        const percentage = ((op.time / totalTime) * 100).toFixed(1);
        report += `${index + 1}. ${op.name}: ${op.time.toFixed(2)}ms (${percentage}%)\n`;
      });
      report += '\n';
    }

    // Detailed Breakdown
    report += '📋 DETAILED BREAKDOWN\n\n';
    operations.forEach(op => {
      const percentage = ((op.time / totalTime) * 100).toFixed(1);
      const icon = parseFloat(percentage) > 30 ? '🔴' : parseFloat(percentage) > 15 ? '🟡' : '🟢';
      
      report += `${icon} ${op.name}\n`;
      report += `   Time: ${op.time.toFixed(2)}ms (${percentage}% of total)\n`;
      
      if (op.data) {
        const dataStr = Object.entries(op.data)
          .map(([key, value]) => `${key}=${value}`)
          .join(', ');
        if (dataStr) {
          report += `   Data: ${dataStr}\n`;
        }
      }
      report += '\n';
    });

    // Key Insights
    report += '💡 KEY INSIGHTS\n\n';
    
    const slowestOp = operations[0];
    if (slowestOp) {
      const slowestPercentage = ((slowestOp.time / totalTime) * 100).toFixed(1);
      report += `• ${slowestOp.name} is the bottleneck (${slowestPercentage}%)\n`;
    }

    const ensOp = operations.find(op => op.name === 'ENS Lookups');
    if (ensOp && ensOp.data?.ensNamesFound) {
      report += `• Found ${ensOp.data.ensNamesFound} ENS names\n`;
    }

    const tokenOp = operations.find(op => op.name === 'TokenDetection');
    if (tokenOp && tokenOp.data?.tokensDetected !== undefined) {
      report += `• Detected ${tokenOp.data.tokensDetected} new tokens\n`;
    }

    const networkOps = operations.filter(op => 
      ['TokenDetection', 'TokenBalances', 'AccountTracker', 'CurrencyRate', 'TokenRates'].includes(op.name)
    );
    if (networkOps.length > 0) {
      const networkTime = networkOps.reduce((sum, op) => sum + op.time, 0);
      const networkPercentage = ((networkTime / totalTime) * 100).toFixed(1);
      report += `• Network operations: ${networkTime.toFixed(2)}ms (${networkPercentage}%)\n`;
    }

    const localOps = operations.filter(op => 
      ['Selector Recompute', 'Get Accounts Hook'].includes(op.name)
    );
    if (localOps.length > 0) {
      const localTime = localOps.reduce((sum, op) => sum + op.time, 0);
      const localPercentage = ((localTime / totalTime) * 100).toFixed(1);
      report += `• Local operations: ${localTime.toFixed(2)}ms (${localPercentage}%)\n`;
    }

    // Persistence Stats
    if (session.persistenceStats) {
      report += '\n💾 PERSISTENCE STATS\n\n';
      report += `Updates: ${session.persistenceStats.updateCount}\n`;
      report += `Total Time: ${session.persistenceStats.totalTime.toFixed(0)}ms\n`;
      report += `Avg Per Update: ${session.persistenceStats.avgPerUpdate.toFixed(2)}ms\n`;
    }

    return report;
  }

  private formatPhase(name: string, phase: PhaseData): string {
    const status = phase.status === 'completed' ? '✅' : 
                   phase.status === 'error' ? '❌' : '⏳';
    const duration = phase.duration?.toFixed(2) || 
                    (performance.now() - phase.startTime).toFixed(2);
    
    let line = `${status} ${name}: ${duration}ms`;
    
    if (phase.data) {
      const dataStr = Object.entries(phase.data)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      line += ` (${dataStr})`;
    }
    
    if (phase.error) {
      line += `\n   Error: ${phase.error}`;
    }
    
    return line + '\n';
  }

  private formatController(controller: ControllerData): string {
    const status = controller.status === 'completed' ? '✅' : 
                   controller.status === 'error' ? '❌' : '⏳';
    const duration = controller.duration?.toFixed(2) || 
                    (performance.now() - controller.startTime).toFixed(2);
    
    let line = `  ${status} ${controller.controller}: ${duration}ms`;
    
    if (controller.data) {
      const dataStr = Object.entries(controller.data)
        .map(([key, value]) => `${key}=${value}`)
        .join(', ');
      line += ` (${dataStr})`;
    }
    
    return line + '\n';
  }

  /**
   * Generate a JSON report for programmatic access
   */
  generateJSONReport(): AccountSyncSession | null {
    return this.currentSession || this.getLastCompletedSession();
  }
}

// Export singleton instance
export const AccountSyncTracker = new AccountSyncTrackerClass();

