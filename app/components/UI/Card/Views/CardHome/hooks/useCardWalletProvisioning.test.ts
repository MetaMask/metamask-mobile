import { Platform } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { toast } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import {
  resolveWalletEntry,
  useCardWalletProvisioning,
  type WalletEntry,
} from './useCardWalletProvisioning';
import { ProvisioningErrorCode } from '../../../pushProvisioning/types';
import {
  CardStatus,
  CardType,
  type CardAccountStatus,
  type CardHomeData,
  type CardShippingAddress,
  type CardWalletProvisioningInfo,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

const mockUsePushProvisioning = jest.fn();
const mockReplace = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
}));

jest.mock('../../../pushProvisioning', () => ({
  usePushProvisioning: (...args: unknown[]) => mockUsePushProvisioning(...args),
  getWalletName: () =>
    jest.requireActual<typeof import('react-native')>('react-native').Platform
      .OS === 'ios'
      ? 'Apple Wallet'
      : 'Google Wallet',
}));

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  return {
    ...actual,
    toast: Object.assign(jest.fn(), { dismiss: jest.fn() }),
  };
});

function homeData(
  walletProvisioning: CardWalletProvisioningInfo | null,
  account: CardAccountStatus | null = null,
): CardHomeData {
  return {
    primaryFundingAsset: null,
    fundingAssets: [],
    availableFundingAssets: [],
    card: walletProvisioning
      ? {
          id: 'card-1',
          status: CardStatus.ACTIVE,
          type: CardType.VIRTUAL,
          lastFour: walletProvisioning.lastFour,
        }
      : null,
    account,
    walletProvisioning,
    alerts: [],
    actions: [],
    delegationSettings: null,
  };
}

const walletProvisioning: CardWalletProvisioningInfo = {
  eligible: true,
  cardholderName: 'Ada Lovelace',
  lastFour: '4242',
  network: 'MASTERCARD',
  primaryAccountIdentifier: '91ad6fea3b52ca58d60d7fd310f789ec',
};

function accountWithAddress(
  address: Partial<CardShippingAddress> = {},
): CardAccountStatus {
  return {
    verificationStatus: null,
    holderName: 'Ada Lovelace',
    shippingAddress: {
      line1: '1 Market St',
      city: 'San Francisco',
      postalCode: '94105',
      country: 'US',
      ...address,
    },
    countryOfResidence: 'US',
    usState: null,
    createdAt: null,
  };
}

function renderProvisioning(
  data: CardHomeData,
  options?: {
    onSuccess?: () => void;
    platformWalletSupported?: boolean;
  },
) {
  return renderHook(() =>
    useCardWalletProvisioning(data, {
      platformWalletSupported: true,
      ...options,
    }),
  );
}

describe('useCardWalletProvisioning', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    mockUsePushProvisioning.mockReturnValue({
      initiateProvisioning: jest.fn(),
      isProvisioning: false,
      isLoading: false,
      canAddToWallet: true,
      isCardInWallet: false,
      pendingVerificationDevices: [],
      canOpenInWallet: true,
      openInWallet: jest.fn(),
    });
  });

  afterEach(() => {
    Platform.OS = originalPlatform;
  });

  it('passes wallet provisioning and the card id to the push hook', () => {
    const { result } = renderProvisioning(homeData(walletProvisioning));

    expect(mockUsePushProvisioning).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card-1',
        walletProvisioning,
      }),
    );
    expect(result.current.isCardInWallet).toBe(false);
    expect(result.current.pendingVerificationDevices).toEqual([]);
    expect(result.current.canOpenInWallet).toBe(true);
    expect(result.current.openInWallet).toBe(
      mockUsePushProvisioning.mock.results[0]?.value.openInWallet,
    );
  });

  it('opens the Apple Pay confirmation screen without a success toast', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onSuccess } = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: () => void;
    };
    onSuccess();

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.CARD.APPLE_PAY_CONFIRMATION,
    );
    expect(toast).not.toHaveBeenCalled();
  });

  it('runs the caller success callback after opening the confirmation screen', () => {
    const onSuccess = jest.fn();

    renderProvisioning(homeData(walletProvisioning), { onSuccess });

    const passedOptions = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: () => void;
    };
    passedOptions.onSuccess();

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.CARD.APPLE_PAY_CONFIRMATION,
    );
    expect(toast).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('shows the Google Wallet success toast instead of the Apple Pay confirmation', () => {
    Platform.OS = 'android';
    const onSuccess = jest.fn();

    renderProvisioning(homeData(walletProvisioning), { onSuccess });

    const passedOptions = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: () => void;
    };
    passedOptions.onSuccess();

    expect(mockReplace).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: strings('card.push_provisioning.success_message', {
          walletName: 'Google Wallet',
        }),
        severity: 'success',
        hasNoTimeout: false,
        showCloseButton: false,
      }),
    );
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not toast when the pass still needs verification', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onSuccess } = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: (result: { activationState: string }) => void;
    };
    onSuccess({ activationState: 'requires_activation' });

    expect(toast).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('does not toast when Apple Wallet already showed the error', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onError } = mockUsePushProvisioning.mock.calls[0][0] as {
      onError: (error: { message: string; code: string }) => void;
    };
    onError({
      message: 'An unexpected error occurred. Try again or contact support.',
      code: ProvisioningErrorCode.WALLET_DECLINED,
    });

    expect(toast).not.toHaveBeenCalled();
  });

  it('hides every wallet entry when Immersve Apple Pay is switched off', () => {
    mockUsePushProvisioning.mockReturnValue({
      initiateProvisioning: jest.fn(),
      isProvisioning: false,
      isLoading: false,
      canAddToWallet: false,
      isCardInWallet: false,
      pendingVerificationDevices: [],
      canOpenInWallet: false,
      openInWallet: jest.fn(),
      hideProvisioningUi: true,
    });

    const { result } = renderProvisioning(homeData(walletProvisioning));

    expect(result.current.walletEntry).toBe('none');
  });

  it('passes null provisioning when the provider has no card', () => {
    renderProvisioning(homeData(null));

    expect(mockUsePushProvisioning).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: undefined,
        walletProvisioning: null,
        userAddress: undefined,
      }),
    );
  });

  it('builds the provisioning address from the shipping address', () => {
    renderProvisioning(
      homeData(
        walletProvisioning,
        accountWithAddress({ line2: 'Apt 2', state: 'CA' }),
      ),
    );

    expect(mockUsePushProvisioning).toHaveBeenCalledWith(
      expect.objectContaining({
        userAddress: expect.objectContaining({
          name: 'Ada Lovelace',
          addressOne: '1 Market St',
          addressTwo: 'Apt 2',
          administrativeArea: 'CA',
          locality: 'San Francisco',
          postalCode: '94105',
        }),
      }),
    );
  });

  it('omits optional address lines when the shipping address has none', () => {
    renderProvisioning(homeData(walletProvisioning, accountWithAddress()));

    expect(mockUsePushProvisioning).toHaveBeenCalledWith(
      expect.objectContaining({
        userAddress: expect.objectContaining({
          addressTwo: undefined,
          administrativeArea: '',
        }),
      }),
    );
  });

  it('shows the provisioning error message', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onError } = mockUsePushProvisioning.mock.calls[0][0] as {
      onError: (error: { message: string }) => void;
    };
    onError({ message: 'Wallet rejected the card' });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Wallet rejected the card',
        severity: 'danger',
        hasNoTimeout: false,
        showCloseButton: false,
      }),
    );
  });

  it('shows a fallback when the provisioning error has no message', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onError } = mockUsePushProvisioning.mock.calls[0][0] as {
      onError: (error: { message: string }) => void;
    };
    onError({ message: '' });

    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: strings('card.push_provisioning.error_unknown'),
        severity: 'danger',
        hasNoTimeout: false,
        showCloseButton: false,
      }),
    );
  });

  it('still shows the error toast without a component-library toast host', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onSuccess, onError } = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: () => void;
      onError: (error: { message: string }) => void;
    };
    onSuccess();
    onError({ message: 'Wallet rejected the card' });

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.CARD.APPLE_PAY_CONFIRMATION,
    );
    expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Wallet rejected the card',
        severity: 'danger',
      }),
    );
  });
});

type WalletEntryInput = Parameters<typeof resolveWalletEntry>[0];

const activeCard: WalletEntryInput = {
  cardStatus: CardStatus.ACTIVE,
  isEligibilityLoading: false,
  canAddToWallet: false,
  isCardInWallet: false,
  platformWalletSupported: true,
};

describe('resolveWalletEntry', () => {
  it.each<{ label: string; input: WalletEntryInput; expected: WalletEntry }>([
    {
      label: 'a frozen card',
      input: {
        ...activeCard,
        cardStatus: CardStatus.FROZEN,
        platformWalletSupported: false,
      },
      expected: 'none',
    },
    {
      label: 'a blocked card',
      input: { ...activeCard, cardStatus: CardStatus.BLOCKED },
      expected: 'none',
    },
    {
      label: 'an active card while eligibility is loading',
      input: { ...activeCard, isEligibilityLoading: true },
      expected: 'none',
    },
    {
      label: 'an active card that can be added to the wallet',
      input: { ...activeCard, canAddToWallet: true },
      expected: 'push',
    },
    {
      label: 'an active card whose platform wallet is unsupported',
      input: { ...activeCard, platformWalletSupported: false },
      expected: 'instructions',
    },
    {
      label: 'an active card that is not yet in a supported wallet',
      input: activeCard,
      expected: 'instructions',
    },
    {
      label: 'an active card that is already in the wallet',
      input: { ...activeCard, isCardInWallet: true },
      expected: 'none',
    },
    {
      label: 'an active card whose pass is pending verification',
      input: { ...activeCard, isCardInWallet: true, canAddToWallet: false },
      expected: 'none',
    },
  ])('returns $expected for $label', ({ input, expected }) => {
    const result = resolveWalletEntry(input);

    expect(result).toBe(expected);
  });
});
