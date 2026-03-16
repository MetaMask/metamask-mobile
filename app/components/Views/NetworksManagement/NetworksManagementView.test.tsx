import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { NetworksManagementViewSelectorsIDs } from './NetworksManagementView.testIds';
import NetworksManagementView from './NetworksManagementView';
import { SECTION_KEYS } from './NetworksManagementView.constants';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

// Mock whenEngineReady to prevent Jest environment teardown errors
jest.mock('../../../core/Analytics/whenEngineReady', () => ({
  whenEngineReady: jest.fn(() => Promise.resolve()),
  isEngineReady: jest.fn(() => false),
  getEngine: jest.fn(() => ({})),
}));

// Mock the hook to control data returned to the component
const mockSections = jest.fn();
jest.mock('./hooks/useNetworkManagementData', () => ({
  useNetworkManagementData: (params: { searchQuery: string }) =>
    mockSections(params),
}));

// Mock useMetrics
jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn().mockReturnThis(),
      build: jest.fn(),
    })),
    addTraitsToUser: jest.fn(),
  }),
}));

const initialState = {
  engine: {
    backgroundState,
  },
};

const mockMainnetItem = {
  chainId: '0x1',
  name: 'Ethereum Mainnet',
  isTestNet: false,
  imageSource: 1,
  rpcUrl: 'https://mainnet.infura.io',
  hasMultipleRpcs: false,
  isPopular: true,
  isAdded: true,
};

const mockPolygonItem = {
  chainId: '0x89',
  name: 'Polygon',
  isTestNet: false,
  imageSource: 2,
  rpcUrl: 'https://polygon-rpc.com',
  hasMultipleRpcs: true,
  isPopular: true,
  isAdded: true,
};

const mockSepoliaItem = {
  chainId: '0xaa36a7',
  name: 'Sepolia',
  isTestNet: true,
  imageSource: 3,
  rpcUrl: 'https://sepolia.infura.io',
  hasMultipleRpcs: false,
  isPopular: true,
  isAdded: true,
};

const mockAvailableItem = {
  chainId: '0xa86a',
  name: 'Avalanche',
  isTestNet: false,
  imageSource: 4,
  rpcUrl: 'https://avalanche.example.com',
  hasMultipleRpcs: false,
  isPopular: true,
  isAdded: false,
};

describe('NetworksManagementView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSections.mockReturnValue({
      sections: [
        {
          key: SECTION_KEYS.ADDED_MAINNETS,
          data: [mockMainnetItem, mockPolygonItem],
        },
        {
          key: SECTION_KEYS.ADDED_TESTNETS,
          data: [mockSepoliaItem],
        },
        {
          key: SECTION_KEYS.AVAILABLE_NETWORKS,
          data: [mockAvailableItem],
        },
      ],
    });
  });

  it('renders the screen with header and search', () => {
    const { getByTestId } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    expect(
      getByTestId(NetworksManagementViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      getByTestId(NetworksManagementViewSelectorsIDs.SEARCH_INPUT),
    ).toBeOnTheScreen();
  });

  it('renders enabled mainnet networks', () => {
    const { getByText } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    expect(getByText('Ethereum Mainnet')).toBeOnTheScreen();
    expect(getByText('Polygon')).toBeOnTheScreen();
  });

  it('renders enabled networks section header', () => {
    const { getByText } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    expect(
      getByText(strings('app_settings.networks_enabled')),
    ).toBeOnTheScreen();
  });

  it('renders add custom network button', () => {
    const { getByTestId } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    expect(
      getByTestId(NetworksManagementViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON),
    ).toBeOnTheScreen();
  });

  it('navigates to NETWORK_DETAILS in add mode when add custom network button is pressed', () => {
    const { getByTestId } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    fireEvent.press(
      getByTestId(NetworksManagementViewSelectorsIDs.ADD_CUSTOM_NETWORK_BUTTON),
    );

    expect(mockNavigate).toHaveBeenCalledWith(Routes.SETTINGS.NETWORK_DETAILS, {
      shouldNetworkSwitchPopToWallet: false,
    });
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    const container = getByTestId(NetworksManagementViewSelectorsIDs.CONTAINER);
    const backButton = container.findByProps({ iconName: 'ArrowLeft' });
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('passes search query to the hook', () => {
    const { getByTestId } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    const searchInput = getByTestId(
      NetworksManagementViewSelectorsIDs.SEARCH_INPUT,
    );
    fireEvent.changeText(searchInput, 'polygon');

    expect(mockSections).toHaveBeenCalledWith(
      expect.objectContaining({ searchQuery: 'polygon' }),
    );
  });

  it('renders empty state when search yields no results', () => {
    mockSections.mockReturnValue({
      sections: [],
    });

    const { getByTestId } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    // Trigger a search so empty state appears
    const searchInput = getByTestId(
      NetworksManagementViewSelectorsIDs.SEARCH_INPUT,
    );
    fireEvent.changeText(searchInput, 'nonexistent');

    expect(
      getByTestId(NetworksManagementViewSelectorsIDs.EMPTY_STATE),
    ).toBeOnTheScreen();
  });

  it('renders test networks section header and content', () => {
    const { getByText } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    expect(
      getByText(strings('app_settings.networks_test_networks')),
    ).toBeOnTheScreen();
    expect(getByText('Sepolia')).toBeOnTheScreen();
  });

  it('renders additional networks section header and content', () => {
    const { getByText } = renderWithProvider(<NetworksManagementView />, {
      state: initialState,
    });

    expect(
      getByText(strings('app_settings.networks_additional')),
    ).toBeOnTheScreen();
    expect(getByText('Avalanche')).toBeOnTheScreen();
  });
});
