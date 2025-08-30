import { NavigationProp, ParamListBase } from '@react-navigation/native';

import { handleCreateAccountUrl } from './handleCreateAccountUrl';
import Routes from '../../../constants/navigation/Routes';
import ReduxService, { ReduxStore } from '../../redux';
import { BridgeViewMode } from '../../../components/UI/Bridge/types';
import { WalletClientType } from '../../SnapKeyring/MultichainWalletSnapClient';
import { BtcScope, SolAccountType, SolScope } from '@metamask/keyring-api';
import { InternalAccount } from '@metamask/keyring-internal-api';

const ACCOUNT_ID_1 = 'account-id-1';

const ACCOUNT_ADDRESS_1 = '8A4AptCThfbuknsbteHgGKXczfJpfjuVA9SLTSGaaLGC';

const SOL_ASSET_ID = `${SolScope.Mainnet}/slip44:501`;

const MOCK_INTERNAL_ACCOUNT_1: InternalAccount = {
  id: ACCOUNT_ID_1,
  address: ACCOUNT_ADDRESS_1,
  type: SolAccountType.DataAccount,
  scopes: [SolScope.Mainnet],
  options: {},
  methods: [],
  metadata: {
    name: 'Test Group 1',
    keyring: { type: 'simple' },
    importTime: Date.now(),
  },
};

const mockState = {
  engine: {
    backgroundState: {
      MultichainBalancesController: {
        balances: {
          [ACCOUNT_ID_1]: {
            [SOL_ASSET_ID]: {
              amount: '0',
              unit: 'SOL',
            },
          },
        },
      },
      KeyringController: {
        keyrings: [],
      },
      AccountsController: {
        internalAccounts: {
          accounts: [MOCK_INTERNAL_ACCOUNT_1],
        },
      },
    },
  },
};

describe('handleCreateAccountUrl', () => {
  let mockNavigation: jest.Mocked<NavigationProp<ParamListBase>>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNavigation = {
      navigate: jest.fn(),
    } as unknown as jest.Mocked<NavigationProp<ParamListBase>>;

    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: jest.fn().mockReturnValue(mockState),
    } as unknown as ReduxStore);
  });

  describe('when no chainId is provided', () => {
    it('returns early without navigation', () => {
      const path = '?otherParam=value';

      handleCreateAccountUrl({ path, navigation: mockNavigation });

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('returns early for empty path', () => {
      const path = '';

      handleCreateAccountUrl({ path, navigation: mockNavigation });

      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('when invalid chainId is provided', () => {
    it('throws an error', () => {
      const path = '?chainId=invalid';
      expect(() =>
        handleCreateAccountUrl({ path, navigation: mockNavigation }),
      ).toThrow(new Error('Unsupported chainId: invalid'));
    });
  });

  describe('when no accounts exist in scope', () => {
    it('navigates to add account modal for Bitcoin chain', () => {
      const path = `?chainId=${BtcScope.Mainnet}`;

      handleCreateAccountUrl({ path, navigation: mockNavigation });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(
        Routes.MODAL.ROOT_MODAL_FLOW,
        {
          screen: Routes.SHEET.ADD_ACCOUNT,
          params: {
            clientType: WalletClientType.Bitcoin,
            scope: BtcScope.Mainnet,
          },
        },
      );
    });
  });

  describe('when accounts exist but none have funds', () => {
    it('navigates to ramps when all accounts have zero balance', () => {
      const path = `?chainId=${SolScope.Mainnet}`;

      handleCreateAccountUrl({ path, navigation: mockNavigation });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.RAMP.BUY, {
        chainId: SolScope.Mainnet,
      });
    });
  });

  describe('when accounts exist and at least one has funds', () => {
    it('navigates to bridge when an account has positive balance', () => {
      const path = `?chainId=${SolScope.Mainnet}`;
      const newMockState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            MultichainBalancesController: {
              ...mockState.engine.backgroundState.MultichainBalancesController,
              balances: {
                [ACCOUNT_ID_1]: {
                  [SOL_ASSET_ID]: {
                    amount: '0.001',
                    unit: 'SOL',
                  },
                },
              },
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: jest.fn().mockReturnValue(newMockState),
      } as unknown as ReduxStore);

      handleCreateAccountUrl({ path, navigation: mockNavigation });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BRIDGE_VIEW,
        params: {
          sourcePage: 'deeplink',
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });

    it('navigates to bridge when an account has very small positive balance', () => {
      const path = `?chainId=${SolScope.Mainnet}`;
      const newMockState = {
        ...mockState,
        engine: {
          ...mockState.engine,
          backgroundState: {
            ...mockState.engine.backgroundState,
            MultichainBalancesController: {
              ...mockState.engine.backgroundState.MultichainBalancesController,
              balances: {
                [ACCOUNT_ID_1]: {
                  [SOL_ASSET_ID]: {
                    amount: '0.00000001',
                    unit: 'SOL',
                  },
                },
              },
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: jest.fn().mockReturnValue(newMockState),
      } as unknown as ReduxStore);

      handleCreateAccountUrl({ path, navigation: mockNavigation });

      expect(mockNavigation.navigate).toHaveBeenCalledWith(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BRIDGE_VIEW,
        params: {
          sourcePage: 'deeplink',
          bridgeViewMode: BridgeViewMode.Unified,
        },
      });
    });
  });
});
