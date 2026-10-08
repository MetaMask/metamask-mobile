import { renderHook } from '@testing-library/react-native';
import {
  resolveWalletEntry,
  useCardWalletProvisioning,
  type WalletEntry,
} from './useCardWalletProvisioning';
import {
  CardStatus,
  CardType,
  type CardHomeData,
  type CardWalletProvisioningInfo,
} from '../../../../../../core/Engine/controllers/card-controller/provider-types';

const mockUsePushProvisioning = jest.fn();

jest.mock('../../../pushProvisioning', () => ({
  usePushProvisioning: (...args: unknown[]) => mockUsePushProvisioning(...args),
  getWalletName: () => 'Apple Wallet',
}));

jest.mock('../../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: { success: { default: 'green' }, error: { default: 'red' } },
  }),
}));

jest.mock('../../../../../../component-library/components/Toast', () => {
  const react = jest.requireActual<typeof import('react')>('react');
  return {
    ToastContext: react.createContext({ toastRef: { current: null } }),
    ToastVariants: { Icon: 'Icon' },
  };
});

function homeData(
  walletProvisioning: CardWalletProvisioningInfo | null,
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
    account: null,
    walletProvisioning,
    alerts: [],
    actions: [],
    delegationSettings: null,
  };
}

describe('useCardWalletProvisioning', () => {
  beforeEach(() => {
    mockUsePushProvisioning.mockReturnValue({
      initiateProvisioning: jest.fn(),
      isProvisioning: false,
      isLoading: false,
      canAddToWallet: true,
      isCardInWallet: false,
    });
  });

  it('passes wallet provisioning and the card id to the push hook', () => {
    const walletProvisioning: CardWalletProvisioningInfo = {
      eligible: true,
      cardholderName: 'Ada Lovelace',
      lastFour: '4242',
      network: 'MASTERCARD',
      primaryAccountIdentifier: '91ad6fea3b52ca58d60d7fd310f789ec',
    };

    const { result } = renderHook(() =>
      useCardWalletProvisioning(homeData(walletProvisioning), true),
    );

    expect(mockUsePushProvisioning).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: 'card-1',
        walletProvisioning,
      }),
    );
    expect(result.current.isCardInWallet).toBe(false);
  });

  it('passes null provisioning when the provider has no card', () => {
    renderHook(() => useCardWalletProvisioning(homeData(null), true));

    expect(mockUsePushProvisioning).toHaveBeenCalledWith(
      expect.objectContaining({
        cardId: undefined,
        walletProvisioning: null,
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
  ])('returns $expected for $label', ({ input, expected }) => {
    const result = resolveWalletEntry(input);

    expect(result).toBe(expected);
  });
});
