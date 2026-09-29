import { renderHook, act } from '@testing-library/react-hooks';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Routes from '../../../../constants/navigation/Routes';
import {
  selectCardActiveProviderId,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import { ReauthenticateErrorType } from '../../../../core/Authentication/types';
import { CardType } from '../types';
import { useRevealCardDetails } from './useRevealCardDetails';

const mockNavigate = jest.fn();
const mockReauthenticate = jest.fn();
const mockFetchCardDetailsToken = jest.fn();
const mockClearImageUrl = jest.fn();
const mockOnImageLoad = jest.fn();
const mockGetCardSensitiveDetails = jest.fn();
const mockSetString = jest.fn();
const mockTrackEvent = jest.fn();
const mockShowToast = jest.requireMock(
  '../../../../component-library/components/Toast',
).__mockToastRef.current.showToast as jest.Mock;
const mockWithBiometricAuth = jest.fn(
  async ({
    onSuccess,
    reauthenticate,
  }: {
    onSuccess: () => void | Promise<void>;
    reauthenticate: () => Promise<unknown>;
  }) => {
    await reauthenticate();
    await onSuccess();
  },
);

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: { icon: { default: 'mock-icon' }, success: { default: 'green' } },
  }),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
    createEventBuilder: () => ({
      addProperties: () => ({
        build: () => ({}),
      }),
    }),
  }),
}));

jest.mock('../../../../core/Authentication/hooks/useAuthentication', () => ({
  __esModule: true,
  default: () => ({ reauthenticate: mockReauthenticate }),
}));

jest.mock('./useCardDetailsToken', () => ({
  __esModule: true,
  default: () => ({
    fetchCardDetailsToken: mockFetchCardDetailsToken,
    isLoading: false,
    isImageLoading: false,
    onImageLoad: mockOnImageLoad,
    imageUrl: null,
    clearImageUrl: mockClearImageUrl,
  }),
}));

jest.mock('../util/withBiometricAuth', () => ({
  withBiometricAuth: (
    ...args: [
      {
        onSuccess: () => void | Promise<void>;
        reauthenticate: () => Promise<unknown>;
      },
    ]
  ) => mockWithBiometricAuth(...args),
}));

jest.mock('../../../../component-library/components/Toast', () => {
  const ReactActual = jest.requireActual('react');
  const toastRef = {
    current: {
      showToast: jest.fn(),
    },
  };
  return {
    ToastContext: ReactActual.createContext({ toastRef }),
    ToastVariants: { Icon: 'Icon' },
    __mockToastRef: toastRef,
  };
});

jest.mock('../../../../core/ClipboardManager', () => ({
  __esModule: true,
  default: {
    setString: (value: string) => mockSetString(value),
  },
}));

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        getCardSensitiveDetails: () => mockGetCardSensitiveDetails(),
      },
    },
  },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockUseNavigation = useNavigation as jest.MockedFunction<
  typeof useNavigation
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const SENSITIVE_DETAILS = {
  pan: '4111111111111111',
  cvv2: '123',
  expiry: '202512',
  embossedName: 'TEST USER',
};

function setup({
  isAuthenticated = true,
  supportsSensitiveDetailsView = false,
}: {
  isAuthenticated?: boolean;
  supportsSensitiveDetailsView?: boolean;
} = {}) {
  mockUseNavigation.mockReturnValue({ navigate: mockNavigate } as never);
  mockUseSelector.mockImplementation((selector) => {
    if (selector === selectIsCardAuthenticated) {
      return isAuthenticated;
    }
    if (selector === selectCardActiveProviderId) {
      return supportsSensitiveDetailsView ? 'immersve' : 'baanx';
    }
    return undefined;
  });

  return renderHook(() =>
    useRevealCardDetails({
      cardType: CardType.VIRTUAL,
      capabilities: {
        supportsSensitiveDetailsView,
      } as never,
    }),
  );
}

describe('useRevealCardDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReauthenticate.mockResolvedValue(undefined);
    mockFetchCardDetailsToken.mockResolvedValue({
      url: 'https://example.com/card.png',
    });
    mockGetCardSensitiveDetails.mockResolvedValue(SENSITIVE_DETAILS);
    mockWithBiometricAuth.mockImplementation(
      async ({
        onSuccess,
        reauthenticate,
      }: {
        onSuccess: () => void | Promise<void>;
        reauthenticate: () => Promise<unknown>;
      }) => {
        await reauthenticate();
        await onSuccess();
      },
    );
  });

  it('navigates to authentication when the user is not authenticated', async () => {
    const { result } = setup({ isAuthenticated: false });

    await act(async () => {
      await result.current.revealCardDetails();
    });

    expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.AUTHENTICATION, {
      showAuthPrompt: true,
    });
    expect(mockWithBiometricAuth).not.toHaveBeenCalled();
  });

  it('fetches a Baanx secure image after biometric success', async () => {
    const { result } = setup({ supportsSensitiveDetailsView: false });

    await act(async () => {
      await result.current.revealCardDetails();
    });

    expect(mockWithBiometricAuth).toHaveBeenCalled();
    expect(mockFetchCardDetailsToken).toHaveBeenCalledWith(CardType.VIRTUAL);
    expect(mockGetCardSensitiveDetails).not.toHaveBeenCalled();
  });

  it('fetches Immersve sensitive fields after biometric success', async () => {
    const { result } = setup({ supportsSensitiveDetailsView: true });

    await act(async () => {
      await result.current.revealCardDetails();
    });

    expect(mockGetCardSensitiveDetails).toHaveBeenCalled();
    expect(result.current.cardSensitiveDetails).toEqual(SENSITIVE_DETAILS);
    expect(mockFetchCardDetailsToken).not.toHaveBeenCalled();
  });

  it('falls through withBiometricAuth for password-sheet fallback', async () => {
    mockWithBiometricAuth.mockImplementationOnce(
      async ({
        onSuccess,
        reauthenticate,
      }: {
        onSuccess: () => void | Promise<void>;
        reauthenticate: () => Promise<unknown>;
      }) => {
        try {
          await reauthenticate();
        } catch {
          return;
        }
        await onSuccess();
      },
    );
    mockReauthenticate.mockRejectedValueOnce(
      new Error(ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS),
    );

    const { result } = setup({ supportsSensitiveDetailsView: true });

    await act(async () => {
      await result.current.revealCardDetails();
    });

    expect(mockWithBiometricAuth).toHaveBeenCalled();
    expect(mockGetCardSensitiveDetails).not.toHaveBeenCalled();
  });

  it('does not fetch details when biometric auth is cancelled', async () => {
    mockWithBiometricAuth.mockImplementationOnce(async () => undefined);

    const { result } = setup({ supportsSensitiveDetailsView: true });

    await act(async () => {
      await result.current.revealCardDetails();
    });

    expect(mockGetCardSensitiveDetails).not.toHaveBeenCalled();
    expect(result.current.isDetailsVisible).toBe(false);
  });

  it('toggles hide via viewCardDetailsAction when details are visible', async () => {
    const { result } = setup({ supportsSensitiveDetailsView: true });

    await act(async () => {
      await result.current.viewCardDetailsAction();
    });
    expect(result.current.cardSensitiveDetails).toEqual(SENSITIVE_DETAILS);

    await act(async () => {
      await result.current.viewCardDetailsAction();
    });

    expect(result.current.cardSensitiveDetails).toBeNull();
    expect(mockClearImageUrl).toHaveBeenCalled();
  });

  it('copies PAN and shows a toast', () => {
    const { result } = setup();

    act(() => {
      result.current.copyCardDetail('4111111111111111');
    });

    expect(mockSetString).toHaveBeenCalledWith('4111111111111111');
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('clears sensitive details on unmount', async () => {
    const { result, unmount } = setup({ supportsSensitiveDetailsView: true });

    await act(async () => {
      await result.current.revealCardDetails();
    });
    expect(result.current.cardSensitiveDetails).toEqual(SENSITIVE_DETAILS);

    unmount();

    expect(mockClearImageUrl).toHaveBeenCalled();
  });

  it('shows an error toast when image fetch fails', async () => {
    mockFetchCardDetailsToken.mockRejectedValueOnce(new Error('network'));

    const { result } = setup({ supportsSensitiveDetailsView: false });

    await act(async () => {
      await result.current.revealCardDetails();
    });

    expect(mockShowToast).toHaveBeenCalled();
  });

  it('clears the image URL and toasts on image error', () => {
    const { result } = setup();

    act(() => {
      result.current.onCardDetailsImageError();
    });

    expect(mockClearImageUrl).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
  });
});
