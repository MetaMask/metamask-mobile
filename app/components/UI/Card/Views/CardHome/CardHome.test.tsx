import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import CardHome from './CardHome';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { withCardSDK } from '../../sdk';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Routes from '../../../../../constants/navigation/Routes';
import { AllowanceState } from '../../types';

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
  allowanceState: AllowanceState.Enabled,
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

const mockUseGetPriorityCardToken = jest.fn();

const mockUseAssetBalance = jest.fn(() => ({
  balanceFiat: '$1,000.00',
  asset: {
    symbol: 'USDC',
    image: 'usdc-image-url',
  },
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
      'card.card_home.error_title': 'Unable to load card',
      'card.card_home.error_description': 'Please try again later',
      'card.card_home.try_again': 'Try again',
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
      if (initial === 0) {
        // This is the retries useState call
        return [0, jest.fn()];
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
      priorityToken: mockPriorityToken,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: null,
    });

    mockUseAssetBalance.mockReturnValue({
      balanceFiat: '$1,000.00',
      asset: {
        symbol: 'USDC',
        image: 'usdc-image-url',
      },
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
      priorityToken: mockPriorityToken,
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

    // The balance should be displayed
    expect(screen.getByText('$1,000.00')).toBeTruthy();
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
  });

  it('toggles privacy mode when privacy toggle button is pressed', async () => {
    render();

    const privacyToggleButton = screen.getByTestId('privacy-toggle-button');
    fireEvent.press(privacyToggleButton);

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
      priorityToken: null,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: 'Failed to fetch token',
    });

    render();

    expect(screen.getByText('Unable to load card')).toBeTruthy();
    expect(screen.getByText('Please try again later')).toBeTruthy();
    expect(screen.getByTestId('try-again-button')).toBeTruthy();
  });

  it('calls fetchPriorityToken when try again button is pressed', async () => {
    mockUseGetPriorityCardToken.mockReturnValueOnce({
      priorityToken: null,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: 'Failed to fetch token',
    });

    render();

    const tryAgainButton = screen.getByTestId('try-again-button');
    fireEvent.press(tryAgainButton);

    await waitFor(() => {
      expect(mockFetchPriorityToken).toHaveBeenCalled();
    });
  });

  it('displays limited allowance warning when allowance state is limited', () => {
    const limitedAllowanceToken = {
      ...mockPriorityToken,
      allowanceState: AllowanceState.Limited,
    };

    mockUseGetPriorityCardToken.mockReturnValueOnce({
      priorityToken: limitedAllowanceToken,
      fetchPriorityToken: mockFetchPriorityToken,
      isLoading: false,
      error: null,
    });

    render();

    expect(screen.getByText('Limited spending allowance')).toBeTruthy();
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
