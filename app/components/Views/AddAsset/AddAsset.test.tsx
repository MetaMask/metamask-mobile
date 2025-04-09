import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import AddAsset, { FilterOption, handleFilterControlsPress } from './AddAsset';
import { AddAssetViewSelectorsIDs } from '../../../../e2e/selectors/wallet/AddAssetView.selectors';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Engine from '../../../core/Engine';
const { PreferencesController } = Engine.context;

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions,
    }),
  };
});

jest.mock('../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenNetworkFilter: jest.fn(),
    },
  },
}));

const mockUseParamsValues: {
  assetType: string;
  collectibleContract?: {
    address: string;
  };
} = {
  assetType: 'collectible',
};

jest.mock('../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../util/navigation/navUtils'),
  useParams: jest.fn(() => mockUseParamsValues),
}));

jest.mock(
  'react-native-scrollable-tab-view',
  () =>
    ({ children }: { children: React.ReactNode }) =>
      <>{children}</>,
);

const initialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

const renderComponent = (component: React.ReactElement) =>
  renderWithProvider(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 0, height: 0 },
        insets: { top: 0, left: 0, right: 0, bottom: 0 },
      }}
    >
      {component}
    </SafeAreaProvider>,
    {
      state: initialState,
    },
  );

describe('AddAsset component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders collectible view correctly', () => {
    mockUseParamsValues.assetType = 'collectible';
    const { toJSON, getByTestId } = renderWithProvider(<AddAsset />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
    expect(getByTestId('add-collectible-screen')).toBeDefined();
  });

  it('renders token view correctly', () => {
    mockUseParamsValues.assetType = 'token';
    const { toJSON, getByTestId } = renderWithProvider(<AddAsset />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
    expect(getByTestId('add-token-screen')).toBeDefined();
  });

  it('handles filter controls press for collectibles', () => {
    mockUseParamsValues.assetType = 'token';
    const { getByTestId, debug } = renderComponent(<AddAsset />);
    debug();

    const filterButton = getByTestId('filter-controls-button');
    fireEvent.press(filterButton);

    expect(getByTestId('select-network-button')).toBeDefined();
  });

  it('renders display nft warning when displayNftMedia is true', () => {
    mockUseParamsValues.assetType = 'collectible';
    const { getByTestId } = renderWithProvider(<AddAsset />, {
      state: initialState,
    });

    expect(
      getByTestId(AddAssetViewSelectorsIDs.WARNING_ENABLE_DISPLAY_MEDIA),
    ).toBeDefined();
  });
});

describe('AddAsset utils', () => {
  const tokenNetworkFilterSpy = jest.spyOn(
    PreferencesController,
    'setTokenNetworkFilter',
  );
  it('should handle AllNetworks filter option', () => {
    const allNetworksEnabled = { '0x1': true, '0x2': true };

    handleFilterControlsPress({
      option: FilterOption.AllNetworks,
      allNetworksEnabled,
      chainId: '0x1',
    });

    expect(tokenNetworkFilterSpy).toHaveBeenCalledWith(allNetworksEnabled);
  });

  it('should handle CurrentNetwork filter option', () => {
    const chainId = '0x1';

    handleFilterControlsPress({
      option: FilterOption.CurrentNetwork,
      allNetworksEnabled: {},
      chainId,
    });

    expect(tokenNetworkFilterSpy).toHaveBeenCalledWith({ [chainId]: true });
  });
});
