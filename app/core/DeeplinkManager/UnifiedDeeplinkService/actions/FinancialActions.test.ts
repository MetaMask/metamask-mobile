import {
  createDepositAction,
  createSwapAction,
  createHomeAction,
  registerFinancialActions,
} from './FinancialActions';
import { ActionRegistry, DeeplinkParams } from '../ActionRegistry';
import { ACTIONS } from '../../../../constants/deeplinks';
import handleDepositCashUrl from '../../Handlers/handleDepositCashUrl';
import { handleSwapUrl } from '../../Handlers/handleSwapUrl';
import { navigateToHomeUrl } from '../../Handlers/handleHomeUrl';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { DeeplinkUrlParams } from '../../ParseManager/extractURLParams';
import Routes from '../../../../constants/navigation/Routes';

// Mock dependencies
jest.mock('../../Handlers/handleDepositCashUrl', () => jest.fn());
jest.mock('../../Handlers/handleSwapUrl');
jest.mock('../../Handlers/handleHomeUrl');
jest.mock('../../../SDKConnect/utils/DevLogger');
jest.mock('../../../../constants/navigation/Routes', () => ({
  SEND_FLOW: {
    SEND_TO: 'SendTo',
  },
  SWAPS: 'Swaps',
  WALLET_VIEW: 'WalletView',
}));

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

describe('FinancialActions', () => {
  const mockNavigation = { navigate: jest.fn() } as unknown as NavigationProp<ParamListBase>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDepositAction', () => {
    it('creates deposit action with correct properties', () => {
      const action = createDepositAction();

      expect(action.name).toBe(ACTIONS.DEPOSIT);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens the deposit cash flow');
      expect(action.handler).toBeDefined();
    });

    it('handles deposit action with path', async () => {
      const action = createDepositAction();
      const params: DeeplinkParams = {
        action: ACTIONS.DEPOSIT,
        path: '/eth',
        params: createDefaultParams(),
        originalUrl: 'metamask://deposit/eth',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('FinancialActions: Handling deposit action', {
        path: '/eth',
        queryParams: createDefaultParams(),
      });
      expect(handleDepositCashUrl).toHaveBeenCalledWith({
        navigation: mockNavigation,
        depositPath: '/eth',
      });
    });

    it('handles deposit action without navigation', async () => {
      const action = createDepositAction();
      const params: DeeplinkParams = {
        action: ACTIONS.DEPOSIT,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/deposit',
        scheme: 'https:',
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleDepositCashUrl).toHaveBeenCalledWith({
        navigation: undefined,
        depositPath: '',
      });
    });
  });

  describe('createSwapAction', () => {
    it('creates swap action with correct properties', () => {
      const action = createSwapAction();

      expect(action.name).toBe(ACTIONS.SWAP);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens the swap flow');
      expect(action.handler).toBeDefined();
    });

    it('handles swap action with path', async () => {
      const action = createSwapAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SWAP,
        path: '/eth-to-usdc',
        params: createDefaultParams(),
        originalUrl: 'metamask://swap/eth-to-usdc',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('FinancialActions: Handling swap action', {
        path: '/eth-to-usdc',
        queryParams: createDefaultParams(),
      });
      expect(handleSwapUrl).toHaveBeenCalledWith({
        swapPath: '/eth-to-usdc',
      });
    });

    it('navigates to swaps when no handler path', async () => {
      const action = createSwapAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SWAP,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://swap',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      // Mock handleSwapUrl to simulate no specific handler
      (handleSwapUrl as jest.Mock).mockImplementation(({ swapPath }) => {
        if (!swapPath) {
          mockNavigation.navigate(Routes.SWAPS);
        }
      });

      await action.handler(params);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.SWAPS);
    });
  });

  /* createSendAction is in AccountActions, not FinancialActions
  describe('createSendAction', () => {
    it('creates send action with correct properties', () => {
      const action = createSendAction();

      expect(action.name).toBe(ACTIONS.SEND);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens send transaction interface');
      expect(action.handler).toBeDefined();
    });

    it('handles send action with address', async () => {
      const action = createSendAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SEND,
        path: '/0x1234567890abcdef',
        params: createDefaultParams(),
        originalUrl: 'metamask://send/0x1234567890abcdef',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith(
        'FinancialActions: Handling send action',
        { path: '/0x1234567890abcdef' }
      );
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.SEND_FLOW.SEND_TO, {
        address: '0x1234567890abcdef',
      });
    });

    it('handles send action without address', async () => {
      const action = createSendAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SEND,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/send',
        scheme: 'https:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.SEND_FLOW.SEND_TO, {});
    });

    it('handles send action without navigation', async () => {
      const action = createSendAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SEND,
        path: '/0x123',
        params: createDefaultParams(),
        originalUrl: 'metamask://send/0x123',
        scheme: 'metamask:',
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });
  */

  /* createPortfolioAction doesn't exist in FinancialActions
  describe('createPortfolioAction', () => {
    it('creates portfolio action with correct properties', () => {
      const action = createPortfolioAction();

      expect(action.name).toBe(ACTIONS.PORTFOLIO);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens portfolio dashboard');
      expect(action.handler).toBeDefined();
    });

    it('handles portfolio action', async () => {
      const action = createPortfolioAction();
      const params: DeeplinkParams = {
        action: ACTIONS.PORTFOLIO,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://portfolio',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('FinancialActions: Handling portfolio action');
      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.WALLET_VIEW);
    });

    it('handles portfolio action without navigation', async () => {
      const action = createPortfolioAction();
      const params: DeeplinkParams = {
        action: ACTIONS.PORTFOLIO,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/portfolio',
        scheme: 'https:',
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });
  */

  describe('createHomeAction', () => {
    it('creates home action with correct properties', () => {
      const action = createHomeAction();

      expect(action.name).toBe(ACTIONS.HOME);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Navigates to the home screen');
      expect(action.handler).toBeDefined();
    });

    it('handles home action with path', async () => {
      const action = createHomeAction();
      const params: DeeplinkParams = {
        action: ACTIONS.HOME,
        path: '/dashboard',
        params: createDefaultParams(),
        originalUrl: 'metamask://home/dashboard',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('FinancialActions: Handling home action', {
        path: '/dashboard'
      });
      expect(navigateToHomeUrl).toHaveBeenCalledWith({
        homePath: '/dashboard',
      });
    });

    it('handles home action without path', async () => {
      const action = createHomeAction();
      const params: DeeplinkParams = {
        action: ACTIONS.HOME,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/home',
        scheme: 'https:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(navigateToHomeUrl).toHaveBeenCalledWith({
        homePath: '',
      });
    });
  });

  describe('registerFinancialActions', () => {
    it('registers all financial actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerFinancialActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: ACTIONS.DEPOSIT }),
        expect.objectContaining({ name: ACTIONS.SWAP }),
        expect.objectContaining({ name: ACTIONS.HOME }),
      ]);
    });

    it('calls registerMany with all actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerFinancialActions(mockRegistry);
      
      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      const registeredActions = (mockRegistry.registerMany as jest.Mock).mock.calls[0][0];
      expect(registeredActions).toHaveLength(3);
    });
  });
});
