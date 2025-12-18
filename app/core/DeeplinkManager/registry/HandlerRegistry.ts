import { UniversalLinkHandler } from '../types/UniversalLinkHandler';
import { CoreUniversalLink } from '../types/CoreUniversalLink';
import Logger from '../../../util/Logger';

/**
 * Registry for managing deep link handlers
 */
export class HandlerRegistry {
  // handlers: {
  //   'swap': [handler1, handler2],
  //   'send': [handler3, handler4],
  //   'home': [handler5, handler6]
  // }
  private handlers: Map<string, UniversalLinkHandler[]> = new Map();
  private globalHandlers: UniversalLinkHandler[] = [];

  /**
   * Register a handler for its supported actions
   */
  register(handler: UniversalLinkHandler): void {
    // for each action that the handler supports
    handler.supportedActions.forEach((action) => {
      const existing = this.handlers.get(action) || [];
      // look for existing handlers for the action
      // and add the handler to the end
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
   * good for auth handlers, URL validation, etc
   */
  registerGlobal(handler: UniversalLinkHandler): void {
    // no need for loop because global is applied to all actions
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

    // Deduplicate handlers (remove duplicates by reference)
    const uniqueHandlers = Array.from(new Set(allHandlers));

    // Filter handlers that can handle this specific link
    const capable = uniqueHandlers.filter((h) => h.canHandle(link));

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
      const filtered = handlers.filter(
        (handlerItem) => handlerItem !== handler,
      );
      if (filtered.length > 0) {
        this.handlers.set(action, filtered);
      } else {
        this.handlers.delete(action);
      }
    });

    // Remove from global handlers
    this.globalHandlers = this.globalHandlers.filter(
      (handlerItem) => handlerItem !== handler,
    );
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
}
