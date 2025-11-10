import { UniversalLinkHandler } from './interfaces/UniversalLinkHandler';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import Logger from '../../../util/Logger';

/**
 * Registry for managing deep link handlers
 */
export class HandlerRegistry {
  private handlers: Map<string, UniversalLinkHandler[]> = new Map();
  private globalHandlers: UniversalLinkHandler[] = [];

  /**
   * Register a handler for its supported actions
   */
  register(handler: UniversalLinkHandler): void {
    handler.supportedActions.forEach((action) => {
      const existing = this.handlers.get(action) || [];
      existing.push(handler);
      // Sort by priority (lower number = higher priority)
      existing.sort((a, b) => a.priority - b.priority);
      this.handlers.set(action, existing);
    });
    Logger.log(
      `Registered handler for actions: ${handler.supportedActions.join(', ')}`,
    );
  }

  /**
   * Register a global handler that runs for all actions
   */
  registerGlobal(handler: UniversalLinkHandler): void {
    this.globalHandlers.push(handler);
    this.globalHandlers.sort((a, b) => a.priority - b.priority);
    Logger.log('Registered global handler');
  }

  /**
   * Find handlers for a given link
   */
  findHandlers(link: CoreUniversalLink): UniversalLinkHandler[] {
    const actionHandlers = this.handlers.get(link.action) || [];
    const allHandlers = [...this.globalHandlers, ...actionHandlers];

    // Filter handlers that can handle this specific link
    const capable = allHandlers.filter((h) => h.canHandle(link));

    // Sort by priority
    capable.sort((a, b) => a.priority - b.priority);

    Logger.log(`Found ${capable.length} handlers for action: ${link.action}`);
    return capable;
  }

  /**
   * Remove a handler from all registrations
   */
  unregister(handler: UniversalLinkHandler): void {
    // Remove from action-specific handlers
    this.handlers.forEach((handlers, action) => {
      const filtered = handlers.filter((h) => h !== handler);
      if (filtered.length > 0) {
        this.handlers.set(action, filtered);
      } else {
        this.handlers.delete(action);
      }
    });

    // Remove from global handlers
    this.globalHandlers = this.globalHandlers.filter((h) => h !== handler);
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    this.handlers.clear();
    this.globalHandlers = [];
  }

  /**
   * Get list of registered actions
   */
  getRegisteredActions(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get handler count for an action
   */
  getHandlerCount(action: string): number {
    return (this.handlers.get(action) || []).length;
  }
}
