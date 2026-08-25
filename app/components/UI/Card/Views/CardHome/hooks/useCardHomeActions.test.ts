import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  selectCardActiveProviderId,
  selectIsCardAuthenticated,
} from '../../../../../../selectors/cardController';
import { useCardHomeActions } from './useCardHomeActions';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({ colors: { success: { default: 'mock-success' } } }),
}));

jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
      build: () => ({}),
    }),
  }),
}));

jest.mock(
  '../../../../../../core/Authentication/hooks/useAuthentication',
  () => ({
    __esModule: true,
    default: () => ({ reauthenticate: jest.fn() }),
  }),
);

jest.mock('../../../hooks/useCardFreeze', () => ({
  __esModule: true,
  default: () => ({ freeze: jest.fn(), unfreeze: jest.fn() }),
}));

jest.mock('../../../hooks/useCardDetailsToken', () => ({
  __esModule: true,
  default: () => ({
    fetchCardDetailsToken: jest.fn(),
    isLoading: false,
    isImageLoading: false,
    onImageLoad: jest.fn(),
    imageUrl: undefined,
    clearImageUrl: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useCardPinToken', () => ({
  __esModule: true,
  default: () => ({
    generatePinToken: jest.fn(),
    isLoading: false,
    reset: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useOpenSwaps', () => ({
  useOpenSwaps: () => ({ openSwaps: jest.fn() }),
}));

jest.mock('../../../hooks/useNavigateToCardPage', () => ({
  useNavigateToCardPage: () => ({
    navigateToTravelPage: jest.fn(),
    navigateToCardTosPage: jest.fn(),
  }),
}));

jest.mock('../../../../../../component-library/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ToastContext: ReactActual.createContext({ toastRef: { current: null } }),
    ToastVariants: { Icon: 'Icon' },
  };
});

jest.mock('../../../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: { setString: jest.fn() },
}));

jest.mock('../../../../../../core/Engine', () => ({
  __esModule: true,
  default: { context: {} },
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

function setup({ isAuthenticated = true }: { isAuthenticated?: boolean } = {}) {
  mockUseNavigation.mockReturnValue({
    navigate: mockNavigate,
  } as never);

  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsCardAuthenticated) {
      return isAuthenticated;
    }
    if (selector === selectCardActiveProviderId) {
      return 'baanx';
    }
    // selectSelectedInternalAccountByScope returns a function
    if (typeof selector === 'function') {
      return () => undefined;
    }
    return undefined;
  });

  return renderHook(() =>
    useCardHomeActions({
      data: null,
      primaryToken: null,
      isFrozen: false,
      cardTermsAndConditionsUrl: 'https://example.com/tos',
      capabilities: null,
    }),
  );
}

describe('useCardHomeActions — transactionHistoryAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('navigates to Money Activity when the destination is money', () => {
    const { result } = setup();

    act(() => {
      result.current.transactionHistoryAction('money');
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.ACTIVITY },
    });
  });

  it('navigates to card transaction history when authenticated', () => {
    const { result } = setup({ isAuthenticated: true });

    act(() => {
      result.current.transactionHistoryAction('card');
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.TRANSACTION_HISTORY);
  });

  it('navigates to card authentication when not authenticated', () => {
    const { result } = setup({ isAuthenticated: false });

    act(() => {
      result.current.transactionHistoryAction('card');
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION, {
      showAuthPrompt: true,
    });
  });
});
