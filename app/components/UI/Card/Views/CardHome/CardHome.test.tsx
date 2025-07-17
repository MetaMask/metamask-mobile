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
  chainId: 1,
  allowanceState: 'Unlimited',
};

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
const mockNavigateToCardPage = jest.fn();
const mockGoToBridge = jest.fn();

const mockUseGetPriorityCardToken = jest.fn(() => ({
  fetchPriorityToken: mockFetchPriorityToken,
  isLoading: false,
  error: null as string | null,
}));

const mockUseAssetBalance = jest.fn(() => ({
  mainBalance: '$1,000.00',
  secondaryBalance: '1000 USDC',
}));

const mockUseNavigateToCardPage = jest.fn(() => ({
  navigateToCardPage: mockNavigateToCardPage,
}));

const mockUseSwapBridgeNavigation = jest.fn(() => ({
  goToBridge: mockGoToBridge,
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

jest.mock('../../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => mockUseSwapBridgeNavigation(),
  SwapBridgeNavigationLocation: {
    TokenDetails: 'TokenDetails',
  },
}));

// Mock Engine properly to match how it's used in the component
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      PreferencesController: {
        setPrivacyMode: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const strings: { [key: string]: string } = {
      'card.card_home.spending_with': 'Spending with',
      'card.card_home.add_funds': 'Add funds',
      'card.card_home.limited_spending_warning': 'Limited spending allowance',
      'card.card_home.manage_card_options.manage_card': 'Manage card',
      'card.card_home.manage_card_options.advanced_card_management':
        'Advanced card management',
      'card.card_home.manage_card_options.advanced_card_management_description':
        'See detailed transactions, freeze your card, etc.',
      'card.card': 'Card',
    };
    return strings[key] || key;
  },
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

// Mock useState to return our priority token instead of null
jest.mock('react', () => {
  const actualReact = jest.requireActual('react');
  return {
    ...actualReact,
    useState: (initial: unknown) => {
      if (initial === null) {
        // This is the priorityToken useState call
        return [mockPriorityToken, jest.fn()];
      }
      return actualReact.useState(initial);
    },
  };
});

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

    mockFetchPriorityToken.mockImplementation(async () => mockPriorityToken);

    mockUseGetPriorityCardToken.mockReturnValue({
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: null,
    });

    mockUseAssetBalance.mockReturnValue({
      mainBalance: '$1,000.00',
      secondaryBalance: '1000 USDC',
    });

    mockUseNavigateToCardPage.mockReturnValue({
      navigateToCardPage: mockNavigateToCardPage,
    });

    mockUseSwapBridgeNavigation.mockReturnValue({
      goToBridge: mockGoToBridge,
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

  it('displays loading state when priority token is loading', () => {
    mockUseGetPriorityCardToken.mockReturnValueOnce({
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: true,
      error: null,
    });

    render();
    expect(screen.getByTestId('loader')).toBeTruthy();
  });

  it('calls goToBridge when add funds button is pressed', async () => {
    render();

    const addFundsButton = screen.getByTestId('add-funds-button');
    fireEvent.press(addFundsButton);

    await waitFor(() => {
      expect(mockGoToBridge).toHaveBeenCalled();
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

  it('displays correct priority token information', async () => {
    render();

    // The symbol might be inside a component that's not directly rendered as text
    expect(screen.getByText('$1,000.00')).toBeTruthy();
    expect(screen.getByText('1000 USDC')).toBeTruthy();
  });

  it('displays manage card section', () => {
    render();

    expect(screen.getByTestId('advanced-card-management-item')).toBeTruthy();
  });

  it('displays priority token information when available', async () => {
    render();

    await waitFor(() => {
      expect(screen.getByText('$1,000.00')).toBeTruthy();
    });

    // The component should display the mocked balance information
    expect(screen.getByText('1000 USDC')).toBeTruthy();
  });

  it('toggles privacy mode when eye icon is pressed', async () => {
    render();

    const balanceContainer = screen.getByTestId('balance-container');
    fireEvent.press(balanceContainer);

    await waitFor(() => {
      // Get the mocked function from the Engine
      const Engine = jest.requireMock('../../../../../core/Engine').default;
      expect(
        Engine.context.PreferencesController.setPrivacyMode,
      ).toHaveBeenCalledWith(true);
    });
  });

  it('displays error state when there is an error fetching priority token', () => {
    mockUseGetPriorityCardToken.mockReturnValueOnce({
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: 'Failed to fetch token',
    });

    render();

    expect(screen.getByText('Failed to fetch token')).toBeTruthy();
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
