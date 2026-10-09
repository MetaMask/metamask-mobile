import React from 'react';
import { renderHook } from '@testing-library/react-native';
import {
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { useCardWalletProvisioning } from './useCardWalletProvisioning';
import {
  CardStatus,
  CardType,
  type CardAccountStatus,
  type CardHomeData,
  type CardShippingAddress,
  type CardWalletProvisioningInfo,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

const mockUsePushProvisioning = jest.fn();
const showToast = jest.fn();

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
  toastRef: { current: { showToast: jest.Mock } | null } = {
    current: { showToast },
  },
) {
  return renderHook(() => useCardWalletProvisioning(data), {
    wrapper: ({ children }) =>
      React.createElement(
        ToastContext.Provider,
        { value: { toastRef } },
        children,
      ),
  });
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

  it('shows a confirmation toast after the card is added', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onSuccess } = mockUsePushProvisioning.mock.calls[0][0] as {
      onSuccess: () => void;
    };
    onSuccess();

    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        variant: ToastVariants.Plain,
        hasNoTimeout: false,
        labelOptions: [
          {
            label: strings('card.push_provisioning.success_message', {
              walletName: 'Apple Wallet',
            }),
          },
        ],
        startAccessory: expect.objectContaining({
          props: {
            name: IconName.Confirmation,
            color: IconColor.SuccessDefault,
            size: IconSize.Lg,
          },
        }),
      }),
    );
  });

  it('shows the provisioning error, or a fallback when the error has no message', () => {
    renderProvisioning(homeData(walletProvisioning));

    const { onError } = mockUsePushProvisioning.mock.calls[0][0] as {
      onError: (error: { message: string }) => void;
    };
    onError({ message: 'Wallet rejected the card' });
    onError({ message: '' });

    expect(showToast).toHaveBeenNthCalledWith(
      1,
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
    expect(showToast).toHaveBeenNthCalledWith(
      2,
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

    expect(showToast).not.toHaveBeenCalled();
  });
});
