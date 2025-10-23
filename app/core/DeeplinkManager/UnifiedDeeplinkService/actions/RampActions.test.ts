import { createBuyCryptoAction, createSellCryptoAction, registerRampActions } from './RampActions';
import { ActionRegistry, DeeplinkParams } from '../ActionRegistry';
import { ACTIONS } from '../../../../constants/deeplinks';
import handleRampUrl from '../../Handlers/handleRampUrl';
import DevLogger from '../../../SDKConnect/utils/DevLogger';
import { NavigationProp, ParamListBase } from '@react-navigation/native';
import { DeeplinkUrlParams } from '../../ParseManager/extractURLParams';
import { RampType } from '../../../../components/UI/Ramp/Aggregator/types';

// Mock dependencies
jest.mock('../../Handlers/handleRampUrl', () => jest.fn());
jest.mock('../../../SDKConnect/utils/DevLogger');

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

describe('RampActions', () => {
  const mockNavigation = { navigate: jest.fn() } as unknown as NavigationProp<ParamListBase>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createBuyCryptoAction', () => {
    it('creates buy action with correct properties', () => {
      const action = createBuyCryptoAction();

      expect(action.name).toBe(ACTIONS.BUY);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens the buy crypto flow');
      expect(action.handler).toBeDefined();
    });

    it('handles buy action with navigation', async () => {
      const action = createBuyCryptoAction();
      const params: DeeplinkParams = {
        action: ACTIONS.BUY,
        path: '/test',
        params: createDefaultParams(),
        originalUrl: 'metamask://buy',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('RampActions: Handling buy crypto action', {
        path: '/test',
        queryParams: createDefaultParams(),
      });
      expect(handleRampUrl).toHaveBeenCalledWith({
        rampPath: '/test',
        navigation: mockNavigation,
        rampType: RampType.BUY,
      });
    });

    it('handles buy action without navigation', async () => {
      const action = createBuyCryptoAction();
      const params: DeeplinkParams = {
        action: ACTIONS.BUY,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://buy',
        scheme: 'metamask:',
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleRampUrl).toHaveBeenCalledWith({
        rampPath: '',
        navigation: undefined,
        rampType: RampType.BUY,
      });
    });

    it('handles buy action with complex path', async () => {
      const action = createBuyCryptoAction();
      const params: DeeplinkParams = {
        action: ACTIONS.BUY,
        path: '/eth/0x123456',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/buy/eth/0x123456',
        scheme: 'https:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleRampUrl).toHaveBeenCalledWith({
        rampPath: '/eth/0x123456',
        navigation: mockNavigation,
        rampType: RampType.BUY,
      });
    });
  });

  describe('createSellCryptoAction', () => {
    it('creates sell action with correct properties', () => {
      const action = createSellCryptoAction();

      expect(action.name).toBe(ACTIONS.SELL);
      expect(action.supportedSchemes).toEqual(['metamask://', 'https://']);
      expect(action.description).toBe('Opens the sell crypto flow');
      expect(action.handler).toBeDefined();
    });

    it('handles sell action with navigation', async () => {
      const action = createSellCryptoAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SELL,
        path: '/usdc',
        params: createDefaultParams(),
        originalUrl: 'metamask://sell/usdc',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('RampActions: Handling sell crypto action', {
        path: '/usdc',
        queryParams: createDefaultParams(),
      });
      expect(handleRampUrl).toHaveBeenCalledWith({
        rampPath: '/usdc',
        navigation: mockNavigation,
        rampType: RampType.SELL,
      });
    });

    it('handles sell-crypto action variant', async () => {
      const action = createSellCryptoAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SELL_CRYPTO,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'https://link.metamask.io/sell-crypto',
        scheme: 'https:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleRampUrl).toHaveBeenCalledWith({
        rampPath: '',
        navigation: mockNavigation,
        rampType: RampType.SELL,
      });
    });

    it('handles sell action without path', async () => {
      const action = createSellCryptoAction();
      const params: DeeplinkParams = {
        action: ACTIONS.SELL,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://sell',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(handleRampUrl).toHaveBeenCalledWith({
        rampPath: '',
        navigation: mockNavigation,
        rampType: RampType.SELL,
      });
    });
  });

  describe('registerRampActions', () => {
    it('registers all ramp actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerRampActions(mockRegistry);

      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      expect(mockRegistry.registerMany).toHaveBeenCalledWith([
        expect.objectContaining({ name: ACTIONS.BUY }),
        expect.objectContaining({ name: ACTIONS.BUY_CRYPTO }),
        expect.objectContaining({ name: ACTIONS.SELL }),
        expect.objectContaining({ name: ACTIONS.SELL_CRYPTO }),
      ]);
    });

    it('calls registerMany with all actions', () => {
      const mockRegistry = {
        registerMany: jest.fn(),
      } as unknown as ActionRegistry;

      registerRampActions(mockRegistry);
      
      expect(mockRegistry.registerMany).toHaveBeenCalledTimes(1);
      const registeredActions = (mockRegistry.registerMany as jest.Mock).mock.calls[0][0];
      expect(registeredActions).toHaveLength(4);
    });
  });
});
