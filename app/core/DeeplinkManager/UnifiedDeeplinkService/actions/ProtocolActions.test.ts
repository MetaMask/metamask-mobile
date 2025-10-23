import {
  createWalletConnectAction,
  createEthereumProtocolAction,
  createFocusAction,
  createEmptyAction,
  registerProtocolActions,
} from './ProtocolActions';
import { ActionRegistry, DeeplinkParams } from '../ActionRegistry';
import { ACTIONS, PROTOCOLS } from '../../../../constants/deeplinks';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { DeeplinkUrlParams } from '../../ParseManager/extractURLParams';
import WC2Manager from '../../../WalletConnect/WalletConnectV2';
import Logger from '../../../../util/Logger';

// Mock dependencies
jest.mock('../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../util/Logger');
jest.mock('../../../WalletConnect/WalletConnectV2');

// Helper function to create default DeeplinkUrlParams
const createDefaultParams = (overrides?: Partial<DeeplinkUrlParams>): DeeplinkUrlParams => ({
  uri: '',
  redirect: '',
  channelId: '',
  comm: '',
  pubkey: '',
  hr: false,
  ...overrides,
});

describe('ProtocolActions', () => {
  const mockNavigation = { navigate: jest.fn() } as unknown as NavigationProp<ParamListBase>;
  let mockWC2Manager: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWC2Manager = {
      connect: jest.fn(),
    };
    
    (WC2Manager.getInstance as jest.Mock).mockResolvedValue(mockWC2Manager);
  });

  describe('createWalletConnectAction', () => {
    it('creates WalletConnect action with correct properties', () => {
      const action = createWalletConnectAction();

      expect(action.name).toBe(ACTIONS.WC);
      expect(action.supportedSchemes).toEqual(['*']);
      expect(action.description).toBe('Handles WalletConnect connection');
      expect(action.handler).toBeDefined();
    });

    it('handles WalletConnect action with uri parameter', async () => {
      const action = createWalletConnectAction();
      const params: DeeplinkParams = {
        action: ACTIONS.WC,
        path: '',
        params: createDefaultParams({
          uri: 'wc:connection-string',
          redirect: 'https://app.com',
        }),
        originalUrl: 'metamask://wc?uri=wc:connection-string',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('ProtocolActions: Handling WalletConnect action', {
        uri: 'wc:connection-string',
        originalUrl: params.originalUrl,
      });
      expect(WC2Manager.getInstance).toHaveBeenCalled();
      expect(mockWC2Manager.connect).toHaveBeenCalledWith({
        wcUri: 'wc:connection-string',
        origin: 'deeplink',
        redirectUrl: 'https://app.com',
      });
    });

    it('handles WalletConnect action without uri parameter', async () => {
      const action = createWalletConnectAction();
      const params: DeeplinkParams = {
        action: ACTIONS.WC,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'wc:connection-string-direct',
        scheme: 'wc:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(mockWC2Manager.connect).toHaveBeenCalledWith({
        wcUri: 'wc:connection-string-direct',
        origin: 'qr-code',
        redirectUrl: '',
      });
    });

    it('handles WalletConnect connection errors', async () => {
      const action = createWalletConnectAction();
      const error = new Error('Connection failed');
      mockWC2Manager.connect.mockRejectedValue(error);

      const params: DeeplinkParams = {
        action: ACTIONS.WC,
        path: '',
        params: createDefaultParams({ uri: 'wc:test' }),
        originalUrl: 'metamask://wc',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await expect(action.handler(params)).rejects.toThrow('Connection failed');
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'DeepLinkManager failed to connect via WalletConnect'
      );
    });
  });

  // Ethereum protocol action is not registered in registerProtocolActions
  // It's handled separately in parseDeeplinkUnified

  describe('createFocusAction', () => {
    it('creates focus action with correct properties', () => {
      const action = createFocusAction();

      expect(action.name).toBe(ACTIONS.FOCUS);
      expect(action.supportedSchemes).toEqual(['metamask://']);
      expect(action.description).toBe('Focuses the app without specific action');
      expect(action.handler).toBeDefined();
    });

    it('handles focus action successfully', async () => {
      const action = createFocusAction();
      const params: DeeplinkParams = {
        action: ACTIONS.FOCUS,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://focus',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('ProtocolActions: Handling focus action');
      // No navigation or other side effects
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('createEmptyAction', () => {
    it('creates empty action with correct properties', () => {
      const action = createEmptyAction();

      expect(action.name).toBe(ACTIONS.EMPTY);
      expect(action.supportedSchemes).toEqual(['metamask://']);
      expect(action.description).toBe('Handles empty metamask:// URLs');
      expect(action.handler).toBeDefined();
    });

    it('handles empty action successfully', async () => {
      const action = createEmptyAction();
      const params: DeeplinkParams = {
        action: ACTIONS.EMPTY,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('ProtocolActions: Handling empty action');
      // No navigation or other side effects
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('registerProtocolActions', () => {
    it('registers all protocol actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerProtocolActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: ACTIONS.WC }),
        expect.objectContaining({ name: ACTIONS.FOCUS }),
        expect.objectContaining({ name: ACTIONS.EMPTY }),
      ]);
    });

    it('calls registerMany with all actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerProtocolActions(mockRegistry);
      
      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      const registeredActions = (mockRegistry.registerMany as jest.Mock).mock.calls[0][0];
      expect(registeredActions).toHaveLength(3);
    });
  });
});