import { NavigationProp, ParamListBase } from '@react-navigation/native';
import DevLogger from '../../SDKConnect/utils/DevLogger';

export interface DeeplinkParams {
  action: string;
  path: string;
  params: Record<string, string | undefined>;
  signature?: string;
  originalUrl: string;
  scheme: string;
  navigation?: NavigationProp<ParamListBase>;
  origin?: string;
}

export interface DeeplinkAction {
  name: string;
  handler: (params: DeeplinkParams) => Promise<void>;
  requiresAuth?: boolean;
  supportedSchemes: string[];
  description?: string;
}

/**
 * ActionRegistry manages all deeplink actions in a unified way.
 * This eliminates duplication between traditional (metamask://) and universal (https://) deeplinks.
 */
export class ActionRegistry {
  private static instance: ActionRegistry;
  private actions = new Map<string, DeeplinkAction>();

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): ActionRegistry {
    if (!ActionRegistry.instance) {
      ActionRegistry.instance = new ActionRegistry();
    }
    return ActionRegistry.instance;
  }

  /**
   * Register a new deeplink action
   */
  register(action: DeeplinkAction): void {
    if (this.actions.has(action.name)) {
      DevLogger.log(
        `ActionRegistry: Overwriting existing action '${action.name}'`,
      );
    }
    this.actions.set(action.name, action);
    DevLogger.log(
      `ActionRegistry: Registered action '${
        action.name
      }' for schemes: ${action.supportedSchemes.join(', ')}`,
    );
  }

  /**
   * Register multiple actions at once
   */
  registerMany(actions: DeeplinkAction[]): void {
    actions.forEach((action) => this.register(action));
  }

  /**
   * Get a registered action by name
   */
  getAction(name: string): DeeplinkAction | undefined {
    return this.actions.get(name);
  }

  /**
   * Check if an action is registered
   */
  hasAction(name: string): boolean {
    return this.actions.has(name);
  }

  /**
   * Execute an action by name
   */
  async execute(actionName: string, params: DeeplinkParams): Promise<boolean> {
    const action = this.actions.get(actionName);

    if (!action) {
      DevLogger.log(
        `ActionRegistry: Unknown action '${actionName}' for URL: ${params.originalUrl}`,
      );
      return false;
    }

    // Check if the scheme is supported for this action
    const schemeWithoutColon = params.scheme.replace(':', '');
    if (
      !action.supportedSchemes.includes('*') &&
      !action.supportedSchemes.some((scheme) =>
        scheme.includes(schemeWithoutColon),
      )
    ) {
      DevLogger.log(
        `ActionRegistry: Action '${actionName}' does not support scheme '${params.scheme}'`,
      );
      return false;
    }

    try {
      DevLogger.log(
        `ActionRegistry: Executing action '${actionName}' with params:`,
        {
          path: params.path,
          params: params.params,
          scheme: params.scheme,
        },
      );

      await action.handler(params);
      return true;
    } catch (error) {
      DevLogger.log(
        `ActionRegistry: Error executing action '${actionName}':`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get all registered actions
   */
  getAllActions(): DeeplinkAction[] {
    return Array.from(this.actions.values());
  }

  /**
   * Clear all registered actions (useful for testing)
   */
  clear(): void {
    this.actions.clear();
  }

  /**
   * Get actions that support a specific scheme
   */
  getActionsForScheme(scheme: string): DeeplinkAction[] {
    const normalizedScheme = scheme.replace(':', '');
    return this.getAllActions().filter(
      (action) =>
        action.supportedSchemes.includes('*') ||
        action.supportedSchemes.some((s) => s.includes(normalizedScheme)),
    );
  }
}

export default ActionRegistry.getInstance();
