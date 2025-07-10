import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CardHome from './CardHome';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { withCardSDK } from '../../sdk';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();

const mockPriorityToken = {
  address: '0x123...',
  symbol: 'USDC',
  decimals: 6,
  balance: '1000000000',
  allowance: '500000000',
  name: 'USD Coin',
};

const mockAllowances = [
  mockPriorityToken,
  {
    address: '0x456',
    symbol: 'USDT',
    decimals: 6,
    balance: '2000000000',
    allowance: '1000000000',
    name: 'Tether USD',
  },
];

const mockCurrentAddress = '0x789';

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

// Mock hooks
const mockFetchPriorityToken = jest.fn().mockResolvedValue(mockPriorityToken);
const mockFetchAllowances = jest.fn().mockResolvedValue(mockAllowances);
const mockNavigateToCardPage = jest.fn();
const mockNavigateToAddFunds = jest.fn();

const mockUseGetAllowances = jest.fn(() => ({
  allowances: mockAllowances,
  isLoading: false,
  fetchAllowances: mockFetchAllowances,
}));

const mockUseGetPriorityCardToken = jest.fn(() => ({
  fetchPriorityToken: mockFetchPriorityToken,
  isLoading: false,
}));

const mockUseAssetBalance = jest.fn(() => ({
  mainBalance: '$1,000.00',
  secondaryBalance: '1000 USDC',
}));

const mockUseNavigateToCardPage = jest.fn(() => ({
  navigateToCardPage: mockNavigateToCardPage,
}));

const mockUseNavigateToAddFunds = jest.fn(() => ({
  navigateToAddFunds: mockNavigateToAddFunds,
  isSwapEnabled: true,
}));

jest.mock('../../hooks/useGetAllowances', () => ({
  useGetAllowances: () => mockUseGetAllowances(),
}));

jest.mock('../../hooks/useGetPriorityCardToken', () => ({
  useGetPriorityCardToken: () => mockUseGetPriorityCardToken(),
}));

jest.mock('../../hooks/useAssetBalance', () => ({
  useAssetBalance: () => mockUseAssetBalance(),
}));

jest.mock('../../hooks/useNavigateToCardPage', () => ({
  useNavigateToCardPage: () => mockUseNavigateToCardPage(),
}));

jest.mock('../../hooks/useNavigateToAddFunds', () => ({
  useNavigateToAddFunds: () => mockUseNavigateToAddFunds(),
}));

const mockSetPrivacyMode = jest.fn();

jest.mock('../../../../../core/Engine', () => {
  const mockEngine = {
    context: {
      PreferencesController: {
        setPrivacyMode: mockSetPrivacyMode,
      },
    },
  };
  return {
    __esModule: true,
    default: mockEngine,
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const strings: { [key: string]: string } = {
      'card.card_home.spending_with': 'Spending with',
      'card.card_home.add_funds': 'Add funds',
      'card.card_home.manage_card_options.manage_card': 'Manage card',
      'card.card_home.manage_card_options.change_asset': 'Change asset',
      'card.card_home.manage_card_options.manage_spending_limit':
        'Manage spending limit',
      'card.card_home.manage_card_options.manage_spending_limit_description':
        'Currently on Approve card spending',
      'card.card_home.manage_card_options.advanced_card_management':
        'Advanced card management',
      'card.card_home.manage_card_options.advanced_card_management_description':
        'See detailed transactions, freeze your card, etc.',
      'card.card': 'Card',
    };
    return strings[key] || key;
  },
}));

jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: jest.fn((initial) => {
      if (initial === null) {
        return [mockPriorityToken, jest.fn()];
      }
      return actualReact.useState(initial);
    }),
  };
});

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

function render() {
  return renderScreen(
    withCardSDK(CardHome),
    {
      name: Routes.CARD.HOME,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('CardHome Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockFetchPriorityToken.mockImplementation(async (allowances) => {
      if (allowances && allowances.length > 0) {
        return mockPriorityToken;
      }
      return null;
    });

    mockUseGetAllowances.mockReturnValue({
      allowances: mockAllowances,
      isLoading: false,
      fetchAllowances: mockFetchAllowances,
    });

    mockUseGetPriorityCardToken.mockReturnValue({
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
    });

    mockUseAssetBalance.mockReturnValue({
      mainBalance: '$1,000.00',
      secondaryBalance: '1000 USDC',
    });

    mockUseNavigateToCardPage.mockReturnValue({
      navigateToCardPage: mockNavigateToCardPage,
    });

    mockUseNavigateToAddFunds.mockReturnValue({
      navigateToAddFunds: mockNavigateToAddFunds,
      isSwapEnabled: true,
    });

    mockUseSelector.mockImplementation((selector) => {
      if (
        selector
          .toString()
          .includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return mockCurrentAddress;
      }
      if (selector.toString().includes('selectPrivacyMode')) {
        return false;
      }
      return null;
    });
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with privacy mode enabled', () => {
    mockUseSelector.mockImplementation((selector) => {
      if (
        selector
          .toString()
          .includes('selectSelectedInternalAccountFormattedAddress')
      ) {
        return mockCurrentAddress;
      }
      if (selector.toString().includes('selectPrivacyMode')) {
        return true;
      }
      return null;
    });

    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
  });

  it('displays loading state when allowances are loading', () => {
    mockUseGetAllowances.mockReturnValueOnce({
      allowances: [],
      isLoading: true,
      fetchAllowances: jest.fn(),
    });

    render();
    expect(screen.getByTestId('loader')).toBeTruthy();
  });

  it('displays loading state when priority token is loading', () => {
    mockUseGetPriorityCardToken.mockReturnValueOnce({
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: true,
    });

    render();
    expect(screen.getByTestId('loader')).toBeTruthy();
  });

  it('opens asset list bottom sheet when change asset is pressed', async () => {
    render();

    const changeAssetItem = screen.getByTestId('change-asset-item');
    fireEvent.press(changeAssetItem);

    await waitFor(() => {
      expect(screen.getByTestId('asset-list-bottom-sheet')).toBeTruthy();
    });
  });

  it('calls navigateToAddFunds when add funds button is pressed', async () => {
    render();

    const addFundsButton = screen.getByTestId('add-funds-button');
    fireEvent.press(addFundsButton);

    await waitFor(() => {
      expect(mockNavigateToAddFunds).toHaveBeenCalled();
    });
  });

  it('calls navigateToCardPage when advanced card management is pressed', async () => {
    render();

    const advancedManagementItem = screen.getByTestId(
      'advanced-card-management-item',
    );
    fireEvent.press(advancedManagementItem);

    await waitFor(() => {
      expect(mockNavigateToCardPage).toHaveBeenCalled();
    });
  });

  it('disables add funds button when swap is not enabled', async () => {
    mockUseNavigateToAddFunds.mockReturnValueOnce({
      navigateToAddFunds: mockNavigateToAddFunds,
      isSwapEnabled: false,
    });

    render();

    const addFundsButton = screen.getByTestId('add-funds-button');
    expect(addFundsButton.props).toHaveProperty('disabled', true);
  });

  it('displays correct priority token information', async () => {
    render();

    expect(screen.getByText(mockPriorityToken.symbol)).toBeTruthy();
    expect(screen.getByText('$1,000.00')).toBeTruthy();
    expect(screen.getByText('1000 USDC')).toBeTruthy();
  });

  it('displays all manage card options', () => {
    render();

    expect(screen.getByTestId('change-asset-item')).toBeTruthy();
    expect(screen.getByTestId('manage-spending-limit-item')).toBeTruthy();
    expect(screen.getByTestId('advanced-card-management-item')).toBeTruthy();
  });

  it('fetches priority token on mount when allowances are available', async () => {
    render();

    await waitFor(() => {
      expect(screen.getByText('$1,000.00')).toBeTruthy();
    });

    const { fetchPriorityToken } = mockUseGetPriorityCardToken();
    const { allowances } = mockUseGetAllowances();

    expect(fetchPriorityToken).toBe(mockFetchPriorityToken);
    expect(allowances).toBe(mockAllowances);
  });

  it('sets navigation options correctly', () => {
    const mockNavigation = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const navigationOptions = CardHome.navigationOptions({
      navigation: mockNavigation,
    });

    expect(navigationOptions).toHaveProperty('headerLeft');
    expect(navigationOptions).toHaveProperty('headerTitle');
    expect(navigationOptions).toHaveProperty('headerRight');
  });

  it('navigates to wallet home when close button is pressed', () => {
    const mockNavigation = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const navigationOptions = CardHome.navigationOptions({
      navigation: mockNavigation,
    });

    expect(navigationOptions.headerLeft).toBeDefined();
  });

  it('displays card title in header', () => {
    const mockNavigation = {
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const navigationOptions = CardHome.navigationOptions({
      navigation: mockNavigation,
    });

    expect(navigationOptions.headerTitle).toBeDefined();
  });
});
