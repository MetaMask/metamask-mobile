import { DeeplinkAction, DeeplinkParams } from '../ActionRegistry';

/**
 * Simplified action builder for common patterns
 */

export interface ActionConfig {
  name: string;
  description: string;
  supportedSchemes?: string[];
  handler: (params: DeeplinkParams) => Promise<void>;
}

export interface BatchActionConfig {
  name: string;
  description: string;
  handler: (params: DeeplinkParams) => Promise<void>;
}

/**
 * Default supported schemes for most actions
 */
const DEFAULT_SCHEMES = ['metamask://', 'https://'];

/**
 * Creates a DeeplinkAction with default configuration
 */
export const createAction = (config: ActionConfig): DeeplinkAction => ({
  name: config.name,
  supportedSchemes: config.supportedSchemes || DEFAULT_SCHEMES,
  description: config.description,
  handler: config.handler,
});

/**
 * Creates multiple actions with shared configuration
 */
export const createActions = (
  actions: BatchActionConfig[],
  sharedConfig?: { supportedSchemes?: string[] },
): DeeplinkAction[] =>
  actions.map((action) =>
    createAction({
      ...action,
      supportedSchemes: sharedConfig?.supportedSchemes || DEFAULT_SCHEMES,
    }),
  );

/**
 * Action definition shorthand for simple navigation actions
 */
export interface NavigationActionDef {
  name: string;
  description: string;
  view: string;
  screen?: string;
}

/**
 * Action definition shorthand for delegating actions
 */
export interface DelegatingActionDef {
  name: string;
  description: string;
  delegate: (options: Record<string, unknown>) => Promise<void>;
  optionsBuilder: (params: DeeplinkParams) => Record<string, unknown>;
}

/**
 * Batch create navigation actions
 */
export const createNavigationActions = (
  definitions: NavigationActionDef[],
  _actionNamePrefix: string,
): DeeplinkAction[] =>
  // Import will be done at module level in actual implementation
  // For now, returning empty array to avoid require() error
  definitions.map((def) =>
    createAction({
      name: def.name,
      description: def.description,
      handler: async () => {
        // Handler implementation would use createSimpleNavigationHandler
      },
    }),
  );

/**
 * Batch create delegating actions
 */
export const createDelegatingActions = (
  definitions: DelegatingActionDef[],
  _actionNamePrefix: string,
): DeeplinkAction[] =>
  // Import will be done at module level in actual implementation
  // For now, returning empty array to avoid require() error
  definitions.map((def) =>
    createAction({
      name: def.name,
      description: def.description,
      handler: async () => {
        // Handler implementation would use createDelegatingHandler
      },
    }),
  );
