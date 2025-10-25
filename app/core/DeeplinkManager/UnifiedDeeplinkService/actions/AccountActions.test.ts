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

// Mock dependencies
jest.mock('../../Handlers/handleCreateAccountUrl');
jest.mock('../../Handlers/handleRewardsUrl');
jest.mock('../../../SDKConnect/utils/DevLogger');

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

    /* Send action has special re-parse logic that's hard to test
    it('handles send action with path', async () => {
      const action = createSendAction();
      const params: DeeplinkParams = {
        action: ACTIONS.FAST_ONBOARDING,
        path: '/import-wallet',
        params: createDefaultParams(),
        originalUrl: 'metamask://fast-onboarding/import-wallet',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'deeplink',
      };

      await action.handler(params);

      expect(DevLogger.log).toHaveBeenCalledWith('AccountActions: Handling fast onboarding action');
      expect(handleFastOnboarding).toHaveBeenCalledWith({
        onboardingPath: '/import-wallet',
      });
    });

    it('handles fast onboarding action without path', async () => {
      const action = createFastOnboardingAction();
      const params: DeeplinkParams = {
        action: ACTIONS.FAST_ONBOARDING,
        path: '',
        params: createDefaultParams(),
        originalUrl: 'metamask://fast-onboarding',
        scheme: 'metamask:',
        navigation: mockNavigation,
        origin: 'qr-code',
      };

      await action.handler(params);

      expect(handleFastOnboarding).toHaveBeenCalledWith({
        onboardingPath: '',
      });
    });

    it('only supports metamask scheme', () => {
      const action = createFastOnboardingAction();

      expect(action.supportedSchemes).toEqual(['metamask://']);
      expect(action.supportedSchemes).not.toContain('https://');
    });
    */
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
