import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../constants/navigation/Routes';
import { NetworksManagementViewSelectorsIDs } from './NetworksManagementView.testIds';
import NetworksManagementView from './NetworksManagementView';
import { SECTION_KEYS } from './NetworksManagementView.constants';
import {
  formatRpcUrlForDisplay,
  MAX_RPC_DISPLAY_LENGTH,
} from './NetworksManagementView.utils';
import hideKeyFromUrl from '../../../util/hideKeyFromUrl';
import hideProtocolFromUrl from '../../../util/hideProtocolFromUrl';

jest.mock('../../../util/hideKeyFromUrl', () => ({
  __esModule: true,
  default: jest.fn((url: string) => url),
}));
jest.mock('../../../util/hideProtocolFromUrl', () => ({
  __esModule: true,
  default: jest.fn((url: string) => url),
}));

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

describe('formatRpcUrlForDisplay', () => {
  beforeEach(() => {
    (hideKeyFromUrl as jest.Mock).mockImplementation((url: string) => url);
    (hideProtocolFromUrl as jest.Mock).mockImplementation((url: string) => url);
  });

  it('strips http prefix when withoutProtocol still starts with http', () => {
    (hideKeyFromUrl as jest.Mock).mockReturnValue('https://rpc.example.com/');
    (hideProtocolFromUrl as jest.Mock).mockReturnValue(
      'https://rpc.example.com/',
    );

    const result = formatRpcUrlForDisplay('https://rpc.example.com/v1/key');

    expect(result).toBe('rpc.example.com/');
  });

  it('strips https prefix when withoutProtocol still starts with https', () => {
    (hideKeyFromUrl as jest.Mock).mockReturnValue('https://mainnet.infura.io/');
    (hideProtocolFromUrl as jest.Mock).mockReturnValue(
      'https://mainnet.infura.io/',
    );

    const result = formatRpcUrlForDisplay('https://mainnet.infura.io/v1/abc');

    expect(result).toBe('mainnet.infura.io/');
  });

  it('returns withoutProtocol when it does not start with http', () => {
    (hideKeyFromUrl as jest.Mock).mockReturnValue('https://polygon-rpc.com');
    (hideProtocolFromUrl as jest.Mock).mockReturnValue('polygon-rpc.com');

    const result = formatRpcUrlForDisplay('https://polygon-rpc.com');

    expect(result).toBe('polygon-rpc.com');
  });

  it('falls back to original url when withoutProtocol is undefined', () => {
    (hideKeyFromUrl as jest.Mock).mockReturnValue(undefined);
    (hideProtocolFromUrl as jest.Mock).mockReturnValue(undefined);

    const url = 'https://fallback.example.com';
    const result = formatRpcUrlForDisplay(url);

    expect(result).toBe(url);
  });

  it('uses original url when withoutProtocol is null (falsy fallback)', () => {
    (hideKeyFromUrl as jest.Mock).mockReturnValue('https://x.com');
    (hideProtocolFromUrl as jest.Mock).mockReturnValue(null);

    const url = 'https://x.com';
    const result = formatRpcUrlForDisplay(url);

    expect(result).toBe(url);
  });

  it('truncates result longer than MAX_RPC_DISPLAY_LENGTH with ellipsis', () => {
    const longHost = 'a'.repeat(40);
    (hideKeyFromUrl as jest.Mock).mockReturnValue(`https://${longHost}`);
    (hideProtocolFromUrl as jest.Mock).mockReturnValue(longHost);

    const result = formatRpcUrlForDisplay(`https://${longHost}`);

    expect(result).toHaveLength(MAX_RPC_DISPLAY_LENGTH);
    expect(result).toBe(`${longHost.slice(0, MAX_RPC_DISPLAY_LENGTH - 1)}…`);
  });

  it('returns result as-is when length equals MAX_RPC_DISPLAY_LENGTH', () => {
    const exact = 'a'.repeat(MAX_RPC_DISPLAY_LENGTH);
    (hideKeyFromUrl as jest.Mock).mockReturnValue(exact);
    (hideProtocolFromUrl as jest.Mock).mockReturnValue(exact);

    const result = formatRpcUrlForDisplay('https://example.com');

    expect(result).toBe(exact);
  });

  it('returns result as-is when length is less than MAX_RPC_DISPLAY_LENGTH', () => {
    (hideKeyFromUrl as jest.Mock).mockReturnValue('https://short.io');
    (hideProtocolFromUrl as jest.Mock).mockReturnValue('short.io');

    const result = formatRpcUrlForDisplay('https://short.io');

    expect(result).toBe('short.io');
  });

  it('returns empty string when withoutProtocol is empty and no fallback needed', () => {
    (hideKeyFromUrl as jest.Mock).mockReturnValue('');
    (hideProtocolFromUrl as jest.Mock).mockReturnValue('');

    const result = formatRpcUrlForDisplay('https://example.com');

    expect(result).toBe('');
  });
});
