import React from 'react';
import { renderHook } from '@testing-library/react-native';
import {
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import Routes from '../../../../../../constants/navigation/Routes';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import type { ToastRef } from '../../../../../../component-library/components/Toast/Toast.types';
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
const showToast = jest.fn();
const closeToast = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ replace: mockReplace }),
}));

jest.mock('../../../pushProvisioning', () => ({
  usePushProvisioning: (...args: unknown[]) => mockUsePushProvisioning(...args),
  getWalletName: () => 'Apple Wallet',
}));

jest.mock('../../../../../../component-library/components/Toast', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return {
    ToastContext: react.createContext({ toastRef: { current: null } }),
    ToastVariants: { Plain: 'Plain', Icon: 'Icon' },
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
  toastRef: React.RefObject<ToastRef | null> = {
    current: { showToast, closeToast },
  },
  options?: {
    onSuccess?: () => void;
    platformWalletSupported?: boolean;
  },
) {
  return renderHook(
    () =>
      useCardWalletProvisioning(data, {
        platformWalletSupported: true,
        ...options,
      }),
    {
      wrapper: ({ children }) =>
        React.createElement(
          ToastContext.Provider,
          { value: { toastRef } },
          children,
        ),
    },
  );
}

describe('useCardWalletProvisioning', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(showToast).not.toHaveBeenCalled();
  });

  it.each(['active', 'pending', undefined] as const)(
    'opens the confirmation screen when the pass activation state is %s',
    (activationState) => {
      renderProvisioning(homeData(walletProvisioning));

      const { onSuccess } = mockUsePushProvisioning.mock.calls[0][0] as {
        onSuccess: (result: {
          status: 'success';
          activationState?: string;
        }) => void;
      };
      onSuccess({ status: 'success', activationState });

      expect(mockReplace).toHaveBeenCalledWith(
        Routes.CARD.APPLE_PAY_CONFIRMATION,
      );
    },
  );

  it('stays on Card Home when the pass still needs verification', () => {
    const onSuccess = jest.fn();
    renderProvisioning(homeData(walletProvisioning), undefined, { onSuccess });

    const passedOptions = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: (result: {
        status: 'success';
        activationState: string;
      }) => void;
    };
    passedOptions.onSuccess({
      status: 'success',
      activationState: 'requires_activation',
    });

    expect(mockReplace).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not toast when provisioning is canceled', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onCancel } = mockUsePushProvisioning.mock.calls[0][0] as {
      onCancel?: () => void;
    };
    onCancel?.();

    expect(showToast).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it.each([
    ProvisioningErrorCode.NETWORK_ERROR,
    ProvisioningErrorCode.UNKNOWN_ERROR,
  ])('shows a toast for a %s', (code) => {
    renderProvisioning(homeData(walletProvisioning));

    const { onError } = mockUsePushProvisioning.mock.calls[0][0] as {
      onError: (error: { message: string; code: string }) => void;
    };
    onError({ message: 'Could not add the card', code });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Could not add the card' }],
      }),
    );
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

    expect(showToast).not.toHaveBeenCalled();
  });

  it('runs the caller success callback after opening the confirmation screen', () => {
    const onSuccess = jest.fn();

    renderProvisioning(homeData(walletProvisioning), undefined, { onSuccess });

    const passedOptions = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: () => void;
    };
    passedOptions.onSuccess();

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.CARD.APPLE_PAY_CONFIRMATION,
    );
    expect(showToast).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledTimes(1);
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

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [{ label: 'Wallet rejected the card' }],
        startAccessory: expect.objectContaining({
          props: {
            name: IconName.Danger,
            color: IconColor.ErrorDefault,
            size: IconSize.Lg,
          },
        }),
      }),
    );
  });

  it('shows a fallback when the provisioning error has no message', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onError } = mockUsePushProvisioning.mock.calls[0][0] as {
      onError: (error: { message: string }) => void;
    };
    onError({ message: '' });

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: strings('card.push_provisioning.error_unknown') },
        ],
      }),
    );
  });

  it('skips the toast when no toast host is mounted', () => {
    renderProvisioning(homeData(walletProvisioning), { current: null });

    const { onSuccess, onError } = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: () => void;
      onError: (error: { message: string }) => void;
    };
    onSuccess();
    onError({ message: 'Wallet rejected the card' });

    expect(mockReplace).toHaveBeenCalledWith(
      Routes.CARD.APPLE_PAY_CONFIRMATION,
    );
    expect(showToast).not.toHaveBeenCalled();
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
