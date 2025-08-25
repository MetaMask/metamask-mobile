import {
  RewardsController,
  getRewardsControllerDefaultState,
} from './RewardsController';
import type { RewardsControllerMessenger } from '../../messengers/rewards-controller-messenger';
import type { RewardsControllerState, LoginResponseDto } from './types';
import { storeSubscriptionToken } from './utils/multi-subscription-token-vault';
import type { InternalAccount } from '@metamask/keyring-internal-api';
import { selectRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import { store } from '../../../../store';
import { RootState } from '../../../../reducers';

// Mock dependencies
jest.mock('./utils/multi-subscription-token-vault');
jest.mock('../../../../util/Logger');
jest.mock('../../../../selectors/featureFlagController/rewards');
jest.mock('../../../../store');
jest.mock('../../../../util/address', () => ({
  isHardwareAccount: jest.fn(),
}));

const mockStoreSubscriptionToken =
  storeSubscriptionToken as jest.MockedFunction<typeof storeSubscriptionToken>;
const mockSelectRewardsEnabledFlag =
  selectRewardsEnabledFlag as jest.MockedFunction<
    typeof selectRewardsEnabledFlag
  >;
const mockStore = store as jest.Mocked<typeof store>;

describe('RewardsController', () => {
  let mockMessenger: jest.Mocked<RewardsControllerMessenger>;
  let rewardsController: RewardsController;

  const mockAccount: InternalAccount = {
    id: 'test-account-id',
    address: '0x1234567890123456789012345678901234567890',
    type: 'eip155:eoa',
    options: {},
    methods: [],
    scopes: [],
    metadata: {
      name: 'Test Account',
      importTime: Date.now(),
      keyring: {
        type: 'HD Key Tree',
      },
    },
  };

  const mockLoginResponse: LoginResponseDto = {
    sessionId: 'test-session-id',
    subscription: {
      id: 'test-subscription-id',
      referralCode: 'test-referral-code',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock messenger
    mockMessenger = {
      subscribe: jest.fn(),
      call: jest.fn(),
      registerActionHandler: jest.fn(),
      unregisterActionHandler: jest.fn(),
      publish: jest.fn(),
      clearEventSubscriptions: jest.fn(),
      registerInitialEventPayload: jest.fn(),
      unsubscribe: jest.fn(),
    } as unknown as jest.Mocked<RewardsControllerMessenger>;

    // Mock feature flag as enabled by default
    mockSelectRewardsEnabledFlag.mockReturnValue(true);
    mockStore.getState.mockReturnValue({} as RootState);

    // Mock successful token storage
    mockStoreSubscriptionToken.mockResolvedValue({ success: true });

    // Mock messenger calls
    (mockMessenger.call as jest.Mock).mockImplementation(
      (...args: unknown[]) => {
        const [actionType] = args;
        if (actionType === 'AccountsController:getSelectedMultichainAccount') {
          return mockAccount;
        }
        if (actionType === 'KeyringController:signPersonalMessage') {
          return '0xmocksignature';
        }
        if (actionType === 'RewardsDataService:login') {
          return Promise.resolve(mockLoginResponse);
        }
        throw new Error(`Unexpected action: ${actionType}`);
      },
    );
  });

  describe('constructor', () => {
    it('should initialize with default state when no state provided', () => {
      rewardsController = new RewardsController({
        messenger: mockMessenger,
      });

      expect(rewardsController.state).toEqual(
        getRewardsControllerDefaultState(),
      );
    });

    it('should initialize with provided state', () => {
      const initialState: Partial<RewardsControllerState> = {
        lastAuthenticatedAccount: '0x123',
        lastAuthTime: 1234567890,
      };

      rewardsController = new RewardsController({
        messenger: mockMessenger,
        state: initialState,
      });

      expect(rewardsController.state.lastAuthenticatedAccount).toBe('0x123');
      expect(rewardsController.state.lastAuthTime).toBe(1234567890);
    });

    it('should always subscribe to events during initialization', () => {
      // Feature flag state shouldn't matter for constructor
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      rewardsController = new RewardsController({
        messenger: mockMessenger,
      });

      expect(mockMessenger.subscribe).toHaveBeenCalledWith(
        'AccountsController:selectedAccountChange',
        expect.any(Function),
      );
      expect(mockMessenger.subscribe).toHaveBeenCalledWith(
        'KeyringController:unlock',
        expect.any(Function),
      );
    });
  });

  describe('feature flag handling in authentication trigger', () => {
    beforeEach(() => {
      jest.clearAllMocks();

      // Re-setup messenger mock
      (mockMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            return '0xmocksignature';
          }
          if (actionType === 'RewardsDataService:login') {
            return Promise.resolve(mockLoginResponse);
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      rewardsController = new RewardsController({
        messenger: mockMessenger,
      });
    });

    it('should skip authentication when feature flag is disabled', async () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(false);

      // Get the handler before clearing mocks
      const accountChangeHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      // Clear any calls from controller initialization
      jest.clearAllMocks();

      expect(accountChangeHandler).toBeDefined();
      await accountChangeHandler?.(mockAccount.address, mockAccount);

      // Should not call any authentication methods after the trigger
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'AccountsController:getSelectedMultichainAccount',
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'KeyringController:signPersonalMessage',
        expect.anything(),
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.anything(),
      );
    });

    it('should proceed with authentication when feature flag is enabled', async () => {
      mockSelectRewardsEnabledFlag.mockReturnValue(true);

      // Trigger authentication by calling the account change handler
      const accountChangeHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      expect(accountChangeHandler).toBeDefined();
      await accountChangeHandler?.(mockAccount.address, mockAccount);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AccountsController:getSelectedMultichainAccount',
      );
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signPersonalMessage',
        expect.objectContaining({
          from: mockAccount.address,
        }),
      );
    });
  });

  describe('resetState', () => {
    it('should reset state to default values', () => {
      rewardsController = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: '0x123',
          lastAuthTime: 1234567890,
          subscription: {
            id: 'test-id',
            referralCode: 'test-code',
          },
        },
      });

      rewardsController.resetState();

      expect(rewardsController.state).toEqual(
        getRewardsControllerDefaultState(),
      );
    });
  });

  describe('getRewardsControllerDefaultState', () => {
    it('should return correct default state', () => {
      const defaultState = getRewardsControllerDefaultState();

      expect(defaultState).toEqual({
        lastAuthenticatedAccount: null,
        lastAuthTime: 0,
        subscription: null,
      });
    });
  });

  describe('silent authentication', () => {
    beforeEach(() => {
      // Reset mocks for each test
      jest.clearAllMocks();

      // Re-setup default mocks
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
      mockStore.getState.mockReturnValue({} as RootState);
      mockStoreSubscriptionToken.mockResolvedValue({ success: true });

      // Re-setup messenger mock
      (mockMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            return '0xmocksignature';
          }
          if (actionType === 'RewardsDataService:login') {
            return Promise.resolve(mockLoginResponse);
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      rewardsController = new RewardsController({
        messenger: mockMessenger,
      });
    });

    it('should perform successful silent authentication', async () => {
      // Trigger authentication by calling the private method through account change
      const accountChangeHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      expect(accountChangeHandler).toBeDefined();
      await accountChangeHandler?.(mockAccount.address, mockAccount);

      // Wait for async operations
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AccountsController:getSelectedMultichainAccount',
      );
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'KeyringController:signPersonalMessage',
        expect.objectContaining({
          from: mockAccount.address,
        }),
      );
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.objectContaining({
          account: mockAccount.address,
          timestamp: expect.any(Number),
          signature: '0xmocksignature',
        }),
      );

      expect(rewardsController.state.subscription).toEqual(
        mockLoginResponse.subscription,
      );
      expect(rewardsController.state.lastAuthenticatedAccount).toBe(
        mockAccount.address,
      );
      expect(rewardsController.state.lastAuthTime).toBeGreaterThan(0);
      expect(mockStoreSubscriptionToken).toHaveBeenCalledWith(
        mockLoginResponse.subscription.id,
        mockLoginResponse.sessionId,
      );
    });

    it('should handle 401 error (not opted in) gracefully', async () => {
      // Create a fresh controller for this test
      const freshController = new RewardsController({
        messenger: mockMessenger,
      });

      (mockMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            return '0xmocksignature';
          }
          if (actionType === 'RewardsDataService:login') {
            throw new Error('Login failed: 401');
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      const accountChangeHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      await accountChangeHandler?.(mockAccount.address, mockAccount);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(freshController.state.subscription).toBeNull();
      expect(freshController.state.lastAuthenticatedAccount).toBe(
        mockAccount.address,
      );
      expect(freshController.state.lastAuthTime).toBeGreaterThan(0);
    });

    it('should handle keyring locked error gracefully', async () => {
      // Create a fresh controller for this test
      const freshController = new RewardsController({
        messenger: mockMessenger,
      });

      (mockMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            throw new Error('MetaMask is locked. Please unlock it first.');
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      const accountChangeHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      await accountChangeHandler?.(mockAccount.address, mockAccount);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not update state when keyring is locked
      expect(freshController.state).toEqual(getRewardsControllerDefaultState());
    });

    it('should skip silent auth for recent authentication', async () => {
      // Clear previous calls
      jest.clearAllMocks();

      // Set recent authentication by creating a new controller with recent auth state
      rewardsController = new RewardsController({
        messenger: mockMessenger,
        state: {
          lastAuthenticatedAccount: mockAccount.address,
          lastAuthTime: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          subscription: null,
        },
      });

      // Reset mock to track only new calls
      (mockMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            return '0xmocksignature';
          }
          if (actionType === 'RewardsDataService:login') {
            return Promise.resolve(mockLoginResponse);
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      const accountChangeHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      await accountChangeHandler?.(mockAccount.address, mockAccount);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not call login service for recent auth
      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AccountsController:getSelectedMultichainAccount',
      );
      expect(mockMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.anything(),
      );
    });

    it('should handle no selected account gracefully', async () => {
      // Create a completely fresh messenger mock
      const freshMessenger = {
        subscribe: jest.fn(),
        call: jest.fn(),
        registerActionHandler: jest.fn(),
        unregisterActionHandler: jest.fn(),
        publish: jest.fn(),
        clearEventSubscriptions: jest.fn(),
        registerInitialEventPayload: jest.fn(),
        unsubscribe: jest.fn(),
      } as unknown as jest.Mocked<RewardsControllerMessenger>;

      // Create a fresh controller for this test
      rewardsController = new RewardsController({
        messenger: freshMessenger,
      });

      (freshMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return undefined;
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      const accountChangeHandler = freshMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      await accountChangeHandler?.(mockAccount.address, mockAccount);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(freshMessenger.call).toHaveBeenCalledWith(
        'AccountsController:getSelectedMultichainAccount',
      );
      expect(freshMessenger.call).not.toHaveBeenCalledWith(
        'KeyringController:signPersonalMessage',
        expect.anything(),
      );
    });

    it('should handle concurrent authentication attempts', async () => {
      const accountChangeHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      // Trigger multiple concurrent authentication attempts
      const promises = [
        accountChangeHandler?.(mockAccount.address, mockAccount),
        accountChangeHandler?.(mockAccount.address, mockAccount),
        accountChangeHandler?.(mockAccount.address, mockAccount),
      ];

      await Promise.all(promises);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should only call login service once due to concurrent protection
      const loginCalls = mockMessenger.call.mock.calls.filter(
        (call) => call[0] === 'RewardsDataService:login',
      );
      expect(loginCalls).toHaveLength(1);
    });
  });

  describe('keyring unlock handling', () => {
    beforeEach(() => {
      // Reset mocks for each test
      jest.clearAllMocks();

      // Re-setup default mocks
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
      mockStore.getState.mockReturnValue({} as RootState);
      mockStoreSubscriptionToken.mockResolvedValue({ success: true });

      // Re-setup messenger mock
      (mockMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            return '0xmocksignature';
          }
          if (actionType === 'RewardsDataService:login') {
            return Promise.resolve(mockLoginResponse);
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      rewardsController = new RewardsController({
        messenger: mockMessenger,
      });
    });

    it('should trigger authentication on keyring unlock', async () => {
      const unlockHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'KeyringController:unlock',
      )?.[1];

      expect(unlockHandler).toBeDefined();
      // Pass the required parameters to the unlock handler
      await unlockHandler?.('KeyringController unlocked', {});
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(mockMessenger.call).toHaveBeenCalledWith(
        'AccountsController:getSelectedMultichainAccount',
      );
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      // Reset mocks for each test
      jest.clearAllMocks();

      // Re-setup default mocks
      mockSelectRewardsEnabledFlag.mockReturnValue(true);
      mockStore.getState.mockReturnValue({} as RootState);
      mockStoreSubscriptionToken.mockResolvedValue({ success: true });

      // Re-setup messenger mock
      (mockMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            return '0xmocksignature';
          }
          if (actionType === 'RewardsDataService:login') {
            return Promise.resolve(mockLoginResponse);
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      rewardsController = new RewardsController({
        messenger: mockMessenger,
      });
    });

    it('should handle network errors during authentication', async () => {
      // Create a fresh controller for this test
      const freshController = new RewardsController({
        messenger: mockMessenger,
      });

      (mockMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            return '0xmocksignature';
          }
          if (actionType === 'RewardsDataService:login') {
            throw new Error('Network error');
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      const accountChangeHandler = mockMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      await accountChangeHandler?.(mockAccount.address, mockAccount);
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Should not update state on network error
      expect(freshController.state).toEqual(getRewardsControllerDefaultState());
    });

    it('should handle signing errors', async () => {
      // Create a completely fresh messenger mock
      const freshMessenger = {
        subscribe: jest.fn(),
        call: jest.fn(),
        registerActionHandler: jest.fn(),
        unregisterActionHandler: jest.fn(),
        publish: jest.fn(),
        clearEventSubscriptions: jest.fn(),
        registerInitialEventPayload: jest.fn(),
        unsubscribe: jest.fn(),
      } as unknown as jest.Mocked<RewardsControllerMessenger>;

      // Create a fresh controller for this test
      rewardsController = new RewardsController({
        messenger: freshMessenger,
      });

      (freshMessenger.call as jest.Mock).mockImplementation(
        (...args: unknown[]) => {
          const [actionType] = args;
          if (
            actionType === 'AccountsController:getSelectedMultichainAccount'
          ) {
            return mockAccount;
          }
          if (actionType === 'KeyringController:signPersonalMessage') {
            throw new Error('Signing failed');
          }
          throw new Error(`Unexpected action: ${actionType}`);
        },
      );

      const accountChangeHandler = freshMessenger.subscribe.mock.calls.find(
        (call) => call[0] === 'AccountsController:selectedAccountChange',
      )?.[1];

      await accountChangeHandler?.(mockAccount.address, mockAccount);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(freshMessenger.call).not.toHaveBeenCalledWith(
        'RewardsDataService:login',
        expect.anything(),
      );
    });
  });

  describe('state persistence', () => {
    it('should maintain state across controller instances', () => {
      const initialState: RewardsControllerState = {
        lastAuthenticatedAccount: '0x123',
        lastAuthTime: 1234567890,
        subscription: {
          id: 'test-id',
          referralCode: 'test-code',
        },
      };

      rewardsController = new RewardsController({
        messenger: mockMessenger,
        state: initialState,
      });

      expect(rewardsController.state).toEqual(initialState);
    });
  });
});
