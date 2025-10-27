import {
  createAction,
  createActions,
  createNavigationActions,
  createDelegatingActions,
  ActionConfig,
  BatchActionConfig,
  NavigationActionDef,
  DelegatingActionDef,
} from './actionBuilder';
import { DeeplinkParams } from '../ActionRegistry';

describe('actionBuilder', () => {
  describe('createAction', () => {
    it('creates a DeeplinkAction with default configuration', () => {
      const config: ActionConfig = {
        name: 'test-action',
        description: 'Test action',
        handler: jest.fn(),
      };

      const action = createAction(config);

      expect(action).toEqual({
        name: 'test-action',
        description: 'Test action',
        supportedSchemes: ['metamask://', 'https://'],
        handler: config.handler,
      });
    });

    it('creates a DeeplinkAction with custom supported schemes', () => {
      const config: ActionConfig = {
        name: 'custom-action',
        description: 'Custom action',
        supportedSchemes: ['custom://'],
        handler: jest.fn(),
      };

      const action = createAction(config);

      expect(action).toEqual({
        name: 'custom-action',
        description: 'Custom action',
        supportedSchemes: ['custom://'],
        handler: config.handler,
      });
    });
  });

  describe('createActions', () => {
    it('creates multiple actions with default configuration', () => {
      const actions: BatchActionConfig[] = [
        {
          name: 'action1',
          description: 'Action 1',
          handler: jest.fn(),
        },
        {
          name: 'action2',
          description: 'Action 2',
          handler: jest.fn(),
        },
      ];

      const result = createActions(actions);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'action1',
        description: 'Action 1',
        supportedSchemes: ['metamask://', 'https://'],
      });
      expect(result[1]).toMatchObject({
        name: 'action2',
        description: 'Action 2',
        supportedSchemes: ['metamask://', 'https://'],
      });
    });

    it('creates multiple actions with shared configuration', () => {
      const actions: BatchActionConfig[] = [
        {
          name: 'action1',
          description: 'Action 1',
          handler: jest.fn(),
        },
        {
          name: 'action2',
          description: 'Action 2',
          handler: jest.fn(),
        },
      ];

      const sharedConfig = {
        supportedSchemes: ['custom://', 'special://'],
      };

      const result = createActions(actions, sharedConfig);

      expect(result).toHaveLength(2);
      result.forEach((action) => {
        expect(action.supportedSchemes).toEqual(['custom://', 'special://']);
      });
    });
  });

  describe('createNavigationActions', () => {
    it('creates navigation actions from definitions', () => {
      const definitions: NavigationActionDef[] = [
        {
          name: 'nav1',
          description: 'Navigation 1',
          view: 'View1',
        },
        {
          name: 'nav2',
          description: 'Navigation 2',
          view: 'View2',
          screen: 'Screen2',
        },
      ];

      const result = createNavigationActions(definitions, 'TestPrefix');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'nav1',
        description: 'Navigation 1',
        supportedSchemes: ['metamask://', 'https://'],
      });
      expect(result[1]).toMatchObject({
        name: 'nav2',
        description: 'Navigation 2',
        supportedSchemes: ['metamask://', 'https://'],
      });

      // Test that handlers are functions
      expect(typeof result[0].handler).toBe('function');
      expect(typeof result[1].handler).toBe('function');
    });

    it('creates actions with async handlers', async () => {
      const definitions: NavigationActionDef[] = [
        {
          name: 'nav1',
          description: 'Navigation 1',
          view: 'View1',
        },
      ];

      const result = createNavigationActions(definitions, 'TestPrefix');
      const mockParams = {} as DeeplinkParams;

      // Handler should be async
      await expect(result[0].handler(mockParams)).resolves.toBeUndefined();
    });
  });

  describe('createDelegatingActions', () => {
    it('creates delegating actions from definitions', () => {
      const mockDelegate = jest.fn();
      const mockOptionsBuilder = jest.fn();

      const definitions: DelegatingActionDef[] = [
        {
          name: 'delegate1',
          description: 'Delegate 1',
          delegate: mockDelegate,
          optionsBuilder: mockOptionsBuilder,
        },
        {
          name: 'delegate2',
          description: 'Delegate 2',
          delegate: mockDelegate,
          optionsBuilder: mockOptionsBuilder,
        },
      ];

      const result = createDelegatingActions(definitions, 'TestPrefix');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'delegate1',
        description: 'Delegate 1',
        supportedSchemes: ['metamask://', 'https://'],
      });
      expect(result[1]).toMatchObject({
        name: 'delegate2',
        description: 'Delegate 2',
        supportedSchemes: ['metamask://', 'https://'],
      });

      // Test that handlers are functions
      expect(typeof result[0].handler).toBe('function');
      expect(typeof result[1].handler).toBe('function');
    });

    it('creates actions with async handlers', async () => {
      const mockDelegate = jest.fn();
      const mockOptionsBuilder = jest.fn();

      const definitions: DelegatingActionDef[] = [
        {
          name: 'delegate1',
          description: 'Delegate 1',
          delegate: mockDelegate,
          optionsBuilder: mockOptionsBuilder,
        },
      ];

      const result = createDelegatingActions(definitions, 'TestPrefix');
      const mockParams = {} as DeeplinkParams;

      // Handler should be async
      await expect(result[0].handler(mockParams)).resolves.toBeUndefined();
    });
  });
});
