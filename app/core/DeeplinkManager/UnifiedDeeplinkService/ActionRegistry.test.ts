import {
  ActionRegistry,
  DeeplinkAction,
  DeeplinkParams,
} from './ActionRegistry';
import { DeeplinkUrlParams } from '../ParseManager/extractURLParams';

// Helper function to create default DeeplinkUrlParams
const createDefaultParams = (
  overrides?: Partial<DeeplinkUrlParams>,
): DeeplinkUrlParams => ({
  uri: '',
  redirect: '',
  channelId: '',
  comm: '',
  pubkey: '',
  hr: false,
  ...overrides,
});

describe('ActionRegistry', () => {
  let registry: ActionRegistry;

  beforeEach(() => {
    // Get a fresh instance and clear it
    registry = ActionRegistry.getInstance();
    registry.clear();
  });

  describe('singleton pattern', () => {
    it('returns the same instance', () => {
      const instance1 = ActionRegistry.getInstance();
      const instance2 = ActionRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('register', () => {
    it('registers a new action', () => {
      const action: DeeplinkAction = {
        name: 'test',
        handler: jest.fn(),
        supportedSchemes: ['metamask://', 'https://'],
      };

      registry.register(action);
      expect(registry.hasAction('test')).toBe(true);
    });

    it('overwrites existing action with same name', () => {
      const action1: DeeplinkAction = {
        name: 'test',
        handler: jest.fn(),
        supportedSchemes: ['metamask://'],
      };

      const action2: DeeplinkAction = {
        name: 'test',
        handler: jest.fn(),
        supportedSchemes: ['https://'],
      };

      registry.register(action1);
      registry.register(action2);

      const retrieved = registry.getAction('test');
      expect(retrieved).toBe(action2);
    });
  });

  describe('registerMany', () => {
    it('registers multiple actions at once', () => {
      const actions: DeeplinkAction[] = [
        {
          name: 'action1',
          handler: jest.fn(),
          supportedSchemes: ['*'],
        },
        {
          name: 'action2',
          handler: jest.fn(),
          supportedSchemes: ['metamask://'],
        },
      ];

      registry.registerMany(actions);
      expect(registry.hasAction('action1')).toBe(true);
      expect(registry.hasAction('action2')).toBe(true);
    });
  });

  describe('execute', () => {
    it('executes registered action successfully', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const action: DeeplinkAction = {
        name: 'buy',
        handler: mockHandler,
        supportedSchemes: ['metamask://', 'https://'],
      };

      registry.register(action);

      const params: DeeplinkParams = {
        action: 'buy',
        path: '/test',
        params: createDefaultParams(),
        originalUrl: 'metamask://buy?amount=100',
        scheme: 'metamask:',
      };

      const result = await registry.execute('buy', params);
      expect(result).toBe(true);
      expect(mockHandler).toHaveBeenCalledWith(params);
    });

    it('returns false for unknown action', async () => {
      const params: DeeplinkParams = {
        action: 'unknown',
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://unknown',
        scheme: 'metamask:',
      };

      const result = await registry.execute('unknown', params);
      expect(result).toBe(false);
    });

    it('returns false when scheme is not supported', async () => {
      const action: DeeplinkAction = {
        name: 'buy',
        handler: jest.fn(),
        supportedSchemes: ['https://'], // Only supports https
      };

      registry.register(action);

      const params: DeeplinkParams = {
        action: 'buy',
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://buy', // Using metamask scheme
        scheme: 'metamask:',
      };

      const result = await registry.execute('buy', params);
      expect(result).toBe(false);
      expect(action.handler).not.toHaveBeenCalled();
    });

    it('supports wildcard scheme', async () => {
      const mockHandler = jest.fn().mockResolvedValue(undefined);
      const action: DeeplinkAction = {
        name: 'universal',
        handler: mockHandler,
        supportedSchemes: ['*'], // Supports all schemes
      };

      registry.register(action);

      const params: DeeplinkParams = {
        action: 'universal',
        path: '',
        params: createDefaultParams(),
        originalUrl: 'custom://universal',
        scheme: 'custom:',
      };

      const result = await registry.execute('universal', params);
      expect(result).toBe(true);
      expect(mockHandler).toHaveBeenCalled();
    });

    it('throws error when handler fails', async () => {
      const error = new Error('Handler failed');
      const mockHandler = jest.fn().mockRejectedValue(error);
      const action: DeeplinkAction = {
        name: 'failing',
        handler: mockHandler,
        supportedSchemes: ['*'],
      };

      registry.register(action);

      const params: DeeplinkParams = {
        action: 'failing',
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://failing',
        scheme: 'metamask:',
      };

      await expect(registry.execute('failing', params)).rejects.toThrow(
        'Handler failed',
      );
    });
  });

  describe('getActionsForScheme', () => {
    beforeEach(() => {
      const actions: DeeplinkAction[] = [
        {
          name: 'metamask-only',
          handler: jest.fn(),
          supportedSchemes: ['metamask://'],
        },
        {
          name: 'https-only',
          handler: jest.fn(),
          supportedSchemes: ['https://'],
        },
        {
          name: 'both',
          handler: jest.fn(),
          supportedSchemes: ['metamask://', 'https://'],
        },
        {
          name: 'universal',
          handler: jest.fn(),
          supportedSchemes: ['*'],
        },
      ];

      registry.registerMany(actions);
    });

    it('returns actions that support specific scheme', () => {
      const metamaskActions = registry.getActionsForScheme('metamask:');
      expect(metamaskActions).toHaveLength(3); // metamask-only, both, universal
      expect(metamaskActions.map((a) => a.name)).toContain('metamask-only');
      expect(metamaskActions.map((a) => a.name)).toContain('both');
      expect(metamaskActions.map((a) => a.name)).toContain('universal');
    });

    it('returns actions that support https scheme', () => {
      const httpsActions = registry.getActionsForScheme('https:');
      expect(httpsActions).toHaveLength(3); // https-only, both, universal
      expect(httpsActions.map((a) => a.name)).toContain('https-only');
      expect(httpsActions.map((a) => a.name)).toContain('both');
      expect(httpsActions.map((a) => a.name)).toContain('universal');
    });

    it('handles scheme with or without colon', () => {
      const withColon = registry.getActionsForScheme('metamask:');
      const withoutColon = registry.getActionsForScheme('metamask');
      expect(withColon).toEqual(withoutColon);
    });
  });

  describe('utility methods', () => {
    it('getAllActions returns all registered actions', () => {
      const actions: DeeplinkAction[] = [
        {
          name: 'action1',
          handler: jest.fn(),
          supportedSchemes: ['*'],
        },
        {
          name: 'action2',
          handler: jest.fn(),
          supportedSchemes: ['*'],
        },
      ];

      registry.registerMany(actions);
      const allActions = registry.getAllActions();
      expect(allActions).toHaveLength(2);
    });

    it('clear removes all actions', () => {
      registry.register({
        name: 'test',
        handler: jest.fn(),
        supportedSchemes: ['*'],
      });

      expect(registry.hasAction('test')).toBe(true);
      registry.clear();
      expect(registry.hasAction('test')).toBe(false);
      expect(registry.getAllActions()).toHaveLength(0);
    });
  });
});
