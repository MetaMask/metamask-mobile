import { renderHook } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useTokenActions, getSwapTokens } from './useTokenActions';
import { TokenI } from '../../Tokens/types';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { selectSelectedInternalAccount } from '../../../../selectors/accountsController';
import { selectSelectedAccountGroup } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { getDetectedGeolocation } from '../../../../reducers/fiatOrders';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import {
  ActionButtonType,
  ActionPosition,
  ActionLocation,
} from '../../../../util/analytics/actionButtonTracking';
import Routes from '../../../../constants/navigation/Routes';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
  useDispatch: () => jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
}));

jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccount: jest.fn(),
}));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroup: jest.fn(),
  }),
);

jest.mock('../../../../selectors/multichainAccounts/accounts', () => ({
  selectSelectedInternalAccountByScope: jest.fn(),
}));

jest.mock('../../../../reducers/fiatOrders', () => ({
  getDetectedGeolocation: jest.fn(),
}));

const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn().mockReturnValue({});
const createMockEventBuilder = () => ({
  addProperties: mockAddProperties,
  build: mockBuild,
});
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

jest.mock('../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockNavigateToSendPage = jest.fn();
jest.mock('../../../Views/confirmations/hooks/useSendNavigation', () => ({
  useSendNavigation: () => ({
    navigateToSendPage: mockNavigateToSendPage,
  }),
}));

const mockGoToBuy = jest.fn();
jest.mock('../../Ramp/hooks/useRampNavigation', () => ({
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

jest.mock('../../Ramp/hooks/useRampsButtonClickData', () => ({
  useRampsButtonClickData: () => ({
    ramp_routing: 'test-routing',
    is_authenticated: true,
    preferred_provider: 'test-provider',
    order_count: 0,
  }),
}));

jest.mock('../../Ramp/hooks/useRampsUnifiedV1Enabled', () =>
  jest.fn(() => false),
);

jest.mock('../../../hooks/useSendNonEvmAsset', () => ({
  useSendNonEvmAsset: () => ({
    sendNonEvmAsset: jest.fn().mockResolvedValue(false),
  }),
}));

const mockGoToSwaps = jest.fn();
const mockNetworkModal = null;
jest.mock('../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({
    goToSwaps: mockGoToSwaps,
    networkModal: mockNetworkModal,
  }),
  SwapBridgeNavigationLocation: {
    TokenView: 'TokenView',
  },
  isAssetFromTrending: jest.fn(() => false),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      getNetworkConfigurationByChainId: jest.fn(() => ({
        rpcEndpoints: [{ networkClientId: 'mainnet' }],
        defaultRpcEndpointIndex: 0,
      })),
    },
    MultichainNetworkController: {
      setActiveNetwork: jest.fn(),
    },
  },
}));

const mockNewAssetTransaction = jest.fn((token) => ({
  type: 'NEW_ASSET_TRANSACTION',
  payload: token,
}));
jest.mock('../../../../actions/transaction', () => ({
  newAssetTransaction: (token: unknown) => mockNewAssetTransaction(token),
}));

const mockUseSelector = jest.mocked(useSelector);

describe('useTokenActions', () => {
  const mockAccountAddress = '0x1234567890abcdef1234567890abcdef12345678';

  const mockAccount = {
    id: 'account-1',
    address: mockAccountAddress,
    metadata: { name: 'Account 1', keyring: { type: 'HD Key Tree' } },
    type: 'eip155:eoa',
  };

  const mockAccountGroup = {
    id: 'group-1',
    name: 'Test Group',
  };

  const defaultToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    chainId: '0x1',
    symbol: 'DAI',
    decimals: 18,
    name: 'Dai Stablecoin',
    image: 'https://example.com/dai.png',
    isETH: false,
    isNative: false,
  } as TokenI;

  const setupDefaultMocks = () => {
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectEvmChainId) {
        return '0x1';
      }
      if (selector === selectSelectedInternalAccount) {
        return mockAccount;
      }
      if (selector === selectSelectedAccountGroup) {
        return mockAccountGroup;
      }
      if (selector === selectSelectedInternalAccountByScope) {
        return () => mockAccount;
      }
      if (selector === getDetectedGeolocation) {
        return 'US';
      }
      if (typeof selector === 'function') {
        return 'ETH';
      }
      return undefined;
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  describe('getSwapTokens', () => {
    it('returns sourceToken as the token and destToken as undefined for regular tokens', () => {
      const result = getSwapTokens(defaultToken);

      expect(result.sourceToken).toMatchObject({
        address: defaultToken.address,
        chainId: defaultToken.chainId,
        symbol: defaultToken.symbol,
      });
      expect(result.destToken).toBeUndefined();
    });
  });

  describe('hook return value', () => {
    it('returns all action handlers and networkModal', () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      expect(result.current).toHaveProperty('onBuy');
      expect(result.current).toHaveProperty('onSend');
      expect(result.current).toHaveProperty('onReceive');
      expect(result.current).toHaveProperty('goToSwaps');
      expect(result.current).toHaveProperty('networkModal');

      expect(typeof result.current.onBuy).toBe('function');
      expect(typeof result.current.onSend).toBe('function');
      expect(typeof result.current.onReceive).toBe('function');
      expect(typeof result.current.goToSwaps).toBe('function');
    });
  });

  describe('onBuy', () => {
    it('calls goToBuy with parsed assetId and tracks analytics', () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.onBuy();

      const expectedAssetId =
        'eip155:1/erc20:0x6B175474E89094C44Da98b954EedeAC495271d0F';
      expect(mockGoToBuy).toHaveBeenCalledTimes(1);
      expect(mockGoToBuy).toHaveBeenCalledWith({
        assetId: expectedAssetId,
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTION_BUTTON_CLICKED,
      );

      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: ActionButtonType.BUY,
          action_position: ActionPosition.FIRST_POSITION,
          location: ActionLocation.ASSET_DETAILS,
        }),
      );

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('onSend', () => {
    it('dispatches transaction and navigates to send page', async () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      await result.current.onSend();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTION_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: ActionButtonType.SEND,
          action_position: ActionPosition.THIRD_POSITION,
          location: ActionLocation.ASSET_DETAILS,
        }),
      );

      expect(mockNewAssetTransaction).toHaveBeenCalledWith(defaultToken);

      expect(mockNavigateToSendPage).toHaveBeenCalledWith({
        location: 'asset_overview',
        asset: defaultToken,
      });
    });
  });

  describe('onReceive', () => {
    it('navigates to share address QR and tracks analytics', () => {
      const { result } = renderHook(() =>
        useTokenActions({
          token: defaultToken,
          networkName: 'Ethereum Mainnet',
        }),
      );

      result.current.onReceive();

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.ACTION_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          action_name: ActionButtonType.RECEIVE,
          action_position: ActionPosition.FOURTH_POSITION,
          location: ActionLocation.ASSET_DETAILS,
        }),
      );

      expect(mockNavigate).toHaveBeenCalledWith(
        Routes.MODAL.MULTICHAIN_ACCOUNT_DETAIL_ACTIONS,
        {
          screen: Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.SHARE_ADDRESS_QR,
          params: {
            address: mockAccountAddress,
            networkName: 'Ethereum Mainnet',
            chainId: '0x1',
            groupId: 'group-1',
          },
        },
      );
    });
  });
});
