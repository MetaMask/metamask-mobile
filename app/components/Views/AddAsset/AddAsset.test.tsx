import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import AddAsset from './AddAsset';
import { fireEvent } from '@testing-library/react-native';
import Routes from '../../../constants/navigation/Routes';
import {
  ImportTokenViewSelectorsIDs,
  NFTImportScreenSelectorsIDs,
} from './ImportAssetView.testIds';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { isNonEvmChainId } from '../../../core/Multichain/utils';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();

jest.mock('../../../util/networks', () => {
  const actual = jest.requireActual('../../../util/networks');
  return {
    ...actual,
    getNetworkNameFromProviderConfig: jest.fn(() => 'Ethereum Mainnet'),
    getNetworkImageSource: jest.fn(() => 'ethereum'),
    getBlockExplorerAddressUrl: jest.fn(() => ({
      title: 'View on Etherscan',
      url: 'https://etherscan.io',
    })),
    isTestNet: jest.fn(() => false),
    getTestNetImageByChainId: jest.fn(() => 'testnet-image'),
    getDefaultNetworkByChainId: jest.fn(() => ({
      imageSource: 'default-image',
    })),
  };
});

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
      goBack: jest.fn(),
    }),
  };
});

const mockUseParamsValues: {
  assetType: string;
  collectibleContract?: { address: string };
} = {
  assetType: 'token',
};

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock(
  '@tommasini/react-native-scrollable-tab-view',
  () =>
    ({ children }: { children: React.ReactNode }) => <>{children}</>,
);

jest.mock('../../../core/Multichain/utils', () => ({
  ...jest.requireActual('../../../core/Multichain/utils'),
  isNonEvmChainId: jest.fn(),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TokenListController: { fetchTokenList: jest.fn() },
    NetworkController: {
      state: { networkConfigurationsByChainId: {} },
    },
  },
}));

jest.mock('../../hooks/useNetworkEnablement/useNetworkEnablement', () => ({
  useNetworkEnablement: jest.fn(() => ({
    enabledNetworksForCurrentNamespace: { '0x1': true },
    enabledNetworksForAllNamespaces: { '0x1': true },
  })),
}));

const mockIsNonEvmChainId = isNonEvmChainId as jest.MockedFunction<
  typeof isNonEvmChainId
>;

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const renderComponent = () =>
  renderWithProvider(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      <AddAsset />
    </SafeAreaProvider>,
    { state: initialState },
  );

describe('AddAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsNonEvmChainId.mockReturnValue(false);
  });

  describe('view routing', () => {
    it('renders token view when assetType is token', () => {
      mockUseParamsValues.assetType = 'token';
      const { getByTestId } = renderComponent();
      expect(getByTestId('add-token-screen')).toBeOnTheScreen();
    });

    it('renders collectible view when assetType is collectible', () => {
      mockUseParamsValues.assetType = 'collectible';
      const { getByTestId } = renderComponent();
      expect(getByTestId('add-collectible-screen')).toBeOnTheScreen();
    });
  });

  describe('custom token header button', () => {
    it('opens the custom token screen from the token header', () => {
      mockUseParamsValues.assetType = 'token';
      const { getByTestId } = renderComponent();

      fireEvent.press(
        getByTestId(ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_BUTTON),
      );

      expect(mockNavigate).toHaveBeenCalledWith(Routes.WALLET.ADD_CUSTOM_TOKEN);
    });

    it('is not shown for collectibles', () => {
      mockUseParamsValues.assetType = 'collectible';
      const { queryByTestId } = renderComponent();

      expect(
        queryByTestId(ImportTokenViewSelectorsIDs.CUSTOM_TOKEN_BUTTON),
      ).toBeNull();
    });
  });

  describe('network selector', () => {
    it('offers an all networks row for tokens', () => {
      mockUseParamsValues.assetType = 'token';
      const { getByTestId, getAllByText } = renderComponent();

      fireEvent.press(
        getByTestId(ImportTokenViewSelectorsIDs.SELECT_NETWORK_BUTTON),
      );

      // The pill and the sheet row
      expect(getAllByText('All networks')).toHaveLength(2);
    });
  });

  describe('EVM and non-EVM chain handling', () => {
    it('shows AddCustomCollectible for EVM chains', () => {
      mockUseParamsValues.assetType = 'collectible';
      mockIsNonEvmChainId.mockReturnValue(false);

      const { getByTestId } = renderComponent();

      expect(
        getByTestId(NFTImportScreenSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('hides AddCustomCollectible for non-EVM chains', () => {
      mockUseParamsValues.assetType = 'collectible';
      mockIsNonEvmChainId.mockReturnValue(true);

      const { queryByTestId } = renderComponent();

      expect(queryByTestId(NFTImportScreenSelectorsIDs.CONTAINER)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles missing collectibleContract param gracefully', () => {
      mockUseParamsValues.assetType = 'collectible';
      delete mockUseParamsValues.collectibleContract;

      expect(() => renderComponent()).not.toThrow();
    });
  });
});
