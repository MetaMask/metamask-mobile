import {
  createAccountAction,
  createRewardsAction,
  createSendAction,
  registerAccountActions,
} from './AccountActions';
import { ActionRegistry, DeeplinkParams } from '../ActionRegistry';
import { ACTIONS } from '../../../../constants/deeplinks';
import { handleCreateAccountUrl } from '../../Handlers/handleCreateAccountUrl';
import { handleRewardsUrl } from '../../Handlers/handleRewardsUrl';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { DeeplinkUrlParams } from '../../ParseManager/extractURLParams';
import { parse } from 'eth-url-parser';

// Mock dependencies
jest.mock('../../Handlers/handleCreateAccountUrl');
jest.mock('../../Handlers/handleRewardsUrl');
jest.mock('../../../SDKConnect/utils/DevLogger');
jest.mock('eth-url-parser');

const mockParse = parse as jest.MockedFunction<typeof parse>;

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

describe('AccountActions', () => {
  const mockNavigation = {
    navigate: jest.fn(),
  } as unknown as NavigationProp<ParamListBase>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAccountAction', () => {
    it('creates account creation action with correct properties', () => {
      const action = createAccountAction();

      expect(action.name).toBe(ACTIONS.CREATE_ACCOUNT);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens the create account flow');
      expect(action.handler).toBeDefined();
    });

    it('handles create account action with path', async () => {
      const action = createAccountAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CREATE_ACCOUNT,
        path: '/hardware',
        params: createDefaultParams(),
        originalUrl: 'metamask://create-account/hardware',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'AccountActions: Handling create account action',
        {
          path: '/hardware',
          queryParams: createDefaultParams(),
        },
      );
      expect(handleCreateAccountUrl).toHaveBeenCalledWith({
        path: '/hardware',
        navigation: mockNavigation,
      });
    });

    it('handles create account action without path', async () => {
      const action = createAccountAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CREATE_ACCOUNT,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/create-account',
        scheme: 'https:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(handleCreateAccountUrl).toHaveBeenCalledWith({
        path: '',
        navigation: mockNavigation,
      });
    });

    it('handles create account action without navigation', async () => {
      const action = createAccountAction();
      const params: DeeplinkParams = {
        action: ACTIONS.CREATE_ACCOUNT,
        path: '/import',
        params: createDefaultParams(),
        originalUrl: 'metamask://create-account/import',
        scheme: 'metamask:',
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleCreateAccountUrl).toHaveBeenCalledWith({
        path: '/import',
        navigation: undefined,
      });
    });
  });

  describe('createRewardsAction', () => {
    it('creates rewards action with correct properties', () => {
      const action = createRewardsAction();

      expect(action.name).toBe(ACTIONS.REWARDS);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens the rewards screen');
      expect(action.handler).toBeDefined();
    });

    it('handles rewards action with path', async () => {
      const action = createRewardsAction();
      const params: DeeplinkParams = {
        action: ACTIONS.REWARDS,
        path: '/claim',
        params: createDefaultParams(),
        originalUrl: 'metamask://rewards/claim',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'AccountActions: Handling rewards action',
        {
          path: '/claim',
          queryParams: createDefaultParams(),
        },
      );
      expect(handleRewardsUrl).toHaveBeenCalledWith({
        rewardsPath: '/claim',
      });
    });

    it('handles rewards action with empty path', async () => {
      const action = createRewardsAction();
      const params: DeeplinkParams = {
        action: ACTIONS.REWARDS,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/rewards',
        scheme: 'https:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleRewardsUrl).toHaveBeenCalledWith({
        rewardsPath: '',
      });
    });

    it('handles rewards action with complex path', async () => {
      const action = createRewardsAction();
      const params: DeeplinkParams = {
        action: ACTIONS.REWARDS,
        path: '/points/history',
        params: createDefaultParams(),
        originalUrl: 'metamask://rewards/points/history',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(handleRewardsUrl).toHaveBeenCalledWith({
        rewardsPath: '/points/history',
      });
    });
  });

  describe('createSendAction', () => {
    it('creates send action with correct properties', () => {
      const action = createSendAction();

      expect(action.name).toBe(ACTIONS.SEND);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens the send flow');
      expect(action.handler).toBeDefined();
    });

    it('navigates to SendView when ethUrl has value parameter', async () => {
      const action = createSendAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SEND,
        path: '/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        params: createDefaultParams(),
        originalUrl:
          'metamask://send/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      // Mock eth-url-parser to return a parsed ethereum URL with value parameter
      mockParse.mockReturnValue({
        scheme: 'ethereum',
        target_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        parameters: {
          value: '1000000000000000000', // 1 ETH in wei
        },
      });

      await action.handler(params);

      expect(mockParse).toHaveBeenCalledWith(
        'metamask://send/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SendView', {
        screen: 'Send',
        params: {
          txMeta: {
            scheme: 'ethereum',
            target_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
            parameters: {
              value: '1000000000000000000',
            },
            source:
              'metamask://send/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
            action: 'send-eth',
          },
        },
      });
    });

    it('navigates to SendFlowView when ethUrl has no value parameter', async () => {
      const action = createSendAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SEND,
        path: '/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        params: createDefaultParams(),
        originalUrl:
          'metamask://send/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      // Mock eth-url-parser to return a parsed ethereum URL without value parameter
      mockParse.mockReturnValue({
        scheme: 'ethereum',
        target_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
        parameters: {}, // No value parameter
      });

      await action.handler(params);

      expect(mockParse).toHaveBeenCalledWith(
        'metamask://send/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith('SendFlowView', {
        screen: 'SendTo',
        params: {
          txMeta: {
            scheme: 'ethereum',
            target_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
            parameters: {},
            source:
              'metamask://send/0x742d35Cc6634C0532925a3b844Bc9e7595f6E123',
            action: 'send-eth',
          },
        },
      });
    });

    it('navigates to SendView for token transfer (TRANSFER function)', async () => {
      const action = createSendAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SEND,
        path: '/0xTokenContract/transfer',
        params: createDefaultParams(),
        originalUrl: 'metamask://send/0xTokenContract/transfer',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      // Mock eth-url-parser to return a parsed ethereum URL with transfer function
      mockParse.mockReturnValue({
        scheme: 'ethereum',
        target_address: '0xTokenContract',
        function_name: 'transfer',
        parameters: {
          address: '0xRecipient',
          uint256: '1000000',
        },
      });

      await action.handler(params);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('SendView', {
        screen: 'Send',
        params: {
          txMeta: {
            scheme: 'ethereum',
            target_address: '0xTokenContract',
            function_name: 'transfer',
            parameters: {
              address: '0xRecipient',
              uint256: '1000000',
            },
            source: 'metamask://send/0xTokenContract/transfer',
            action: 'send-token',
          },
        },
      });
    });

    it('handles error when parsing fails', async () => {
      const action = createSendAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SEND,
        path: '/invalid-address',
        params: createDefaultParams(),
        originalUrl: 'metamask://send/invalid-address',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      const error = new Error('Invalid ethereum URL');
      mockParse.mockImplementation(() => {
        throw error;
      });

      await expect(action.handler(params)).rejects.toThrow(
        'Invalid ethereum URL',
      );
      expect(DevLogger.log).toHaveBeenCalledWith(
        'AccountActions: Error handling send action',
        error,
      );
    });
  });

  describe('registerAccountActions', () => {
    it('registers all account actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerAccountActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: ACTIONS.CREATE_ACCOUNT }),
        expect.objectContaining({ name: ACTIONS.REWARDS }),
        expect.objectContaining({ name: ACTIONS.SEND }),
      ]);
    });

    it('calls registerMany with all actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerAccountActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      const registeredActions = (mockRegistry.registerMany as jest.Mock).mock
        .calls[0][0];
      expect(registeredActions).toHaveLength(3);
    });

    it('registers actions in correct order', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerAccountActions(mockRegistry);

      const actions = (mockRegistry.registerMany as jest.Mock).mock.calls[0][0];
      expect(actions[0].name).toBe(ACTIONS.CREATE_ACCOUNT);
      expect(actions[1].name).toBe(ACTIONS.REWARDS);
      expect(actions[2].name).toBe(ACTIONS.SEND);
    });
  });
});
