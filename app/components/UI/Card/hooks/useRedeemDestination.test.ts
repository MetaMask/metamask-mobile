import { renderHook } from '@testing-library/react-native';
import type { CaipChainId } from '@metamask/utils';
import useRedeemDestination from './useRedeemDestination';
import {
  FundingStatus,
  type CardFundingToken,
  type CardWalletExternalPriorityResponse,
} from '../types';

let mockAnyMoneyAccountDelegated = true;
let mockExternalWalletPriority: CardWalletExternalPriorityResponse[] = [];
let mockFundingTokens: CardFundingToken[] = [];
let mockIsResidencyBlocked = false;
let mockPrimaryMoneyAccount: { address: string } | undefined = {
  address: '0xprimary',
};

const mockMoneyAccountToken = {
  isMoneyAccountEntry: true,
  caipChainId: 'eip155:59144',
  symbol: 'musd',
};

const mockVedaConfig = {
  caipChainId: 'eip155:143',
  address: '0xveda0000000000000000000000000000000000aa',
  decimals: 6,
  delegationContract: '0xdelegation00000000000000000000000000000bb',
};

jest.mock('../../../../selectors/cardController', () => ({
  selectCardFundingTokens: jest.fn(() => mockFundingTokens),
  selectCardExternalWalletPriority: jest.fn(() => mockExternalWalletPriority),
  selectIsAnyMoneyAccountDelegatedForCard: jest.fn(
    () => mockAnyMoneyAccountDelegated,
  ),
  selectIsCardResidencyBlocked: jest.fn(() => mockIsResidencyBlocked),
  selectCardDelegationToken: jest.fn(() => mockMoneyAccountToken),
  selectMoneyAccountVedaTokenConfig: jest.fn(() => mockVedaConfig),
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(() => mockPrimaryMoneyAccount),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

const priorityEntry = (
  overrides: Partial<CardWalletExternalPriorityResponse> = {},
): CardWalletExternalPriorityResponse => ({
  id: 1,
  address: '0xabc',
  currency: 'steur',
  network: 'linea',
  priority: 1,
  ...overrides,
});

const fundingToken = (
  overrides: Partial<CardFundingToken> = {},
): CardFundingToken =>
  ({
    caipChainId: 'eip155:59144' as CaipChainId,
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0xusdc',
    decimals: 6,
    fundingStatus: FundingStatus.Enabled,
    spendableBalance: '0',
    ...overrides,
  }) as CardFundingToken;

describe('useRedeemDestination', () => {
  beforeEach(() => {
    mockIsResidencyBlocked = false;
    mockPrimaryMoneyAccount = { address: '0xprimary' };
    mockAnyMoneyAccountDelegated = true;
    mockExternalWalletPriority = [];
    mockFundingTokens = [];
  });

  describe('Monad redemptions', () => {
    it('routes to the Money Account vault entry when a higher-ranked Monad wallet exists', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          id: 1,
          address: '0x2be7611111111111111111111111111111111111',
          currency: 'usdc',
          network: 'monad',
          priority: 2,
        }),
        priorityEntry({
          id: 2,
          address: '0x85d1f62222222222222222222222222222222222',
          currency: 'veda',
          network: 'monad',
          priority: 3,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'monad' }),
      );

      expect(result.current.receivingAddress).toBe(
        '0x85d1f62222222222222222222222222222222222',
      );
      expect(result.current.isMoneyAccountDestination).toBe(true);
    });

    it('falls back to the primary Money Account address when no Monad vault entry is linked', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x2be7611111111111111111111111111111111111',
          currency: 'usdc',
          network: 'monad',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'monad' }),
      );

      expect(result.current.receivingAddress).toBe('0xprimary');
      expect(result.current.isMoneyAccountDestination).toBe(true);
    });

    it('resolves no address for Monad when neither a vault entry nor a primary Money Account exists', () => {
      mockPrimaryMoneyAccount = undefined;
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x2be7611111111111111111111111111111111111',
          currency: 'usdc',
          network: 'monad',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'monad' }),
      );

      expect(result.current.receivingAddress).toBeUndefined();
      expect(result.current.isMoneyAccountDestination).toBe(true);
    });

    it('resolves no address for Monad when the resident region is blocked', () => {
      mockIsResidencyBlocked = true;
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x85d1f62222222222222222222222222222222222',
          currency: 'veda',
          network: 'monad',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'monad' }),
      );

      expect(result.current.receivingAddress).toBeUndefined();
      expect(result.current.isMoneyAccountDestination).toBe(false);
    });

    it('marks the destination unapproved for Monad when the resident region is blocked', () => {
      mockIsResidencyBlocked = true;
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x85d1f62222222222222222222222222222222222',
          currency: 'veda',
          network: 'monad',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'monad' }),
      );

      expect(result.current.hasApprovedDestination).toBe(false);
    });

    it('resolves a Money account destination for Monad redemptions', () => {
      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'monad' }),
      );

      expect(result.current.isMoneyAccountDestination).toBe(true);
      expect(result.current.receivingAddress).toBe('0xprimary');
    });

    it('identifies a Money Account destination from a veda/monad priority entry', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x5b16dce915ee64319136a22e9ab01515c18646df',
          currency: 'veda',
          network: 'monad',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'monad' }),
      );

      expect(result.current.isMoneyAccountDestination).toBe(true);
    });
  });

  describe('Linea redemptions', () => {
    it('resolves the lowest priority number among several linked Linea wallets', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          id: 1,
          address: '0x9e16319a3895f88e74f3b4dea012516df8a75cdc',
          currency: 'steur',
          network: 'linea',
          priority: 1,
        }),
        priorityEntry({
          id: 2,
          address: '0xlowpriority000000000000000000000000000002',
          currency: 'usdc',
          network: 'linea',
          priority: 2,
        }),
        priorityEntry({
          id: 3,
          address: '0x5b16dce915ee64319136a22e9ab01515c18646df',
          currency: 'veda',
          network: 'monad',
          priority: 0,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.receivingAddress).toBe(
        '0x9e16319a3895f88e74f3b4dea012516df8a75cdc',
      );
    });

    it('resolves an external wallet destination rather than the Money Account', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x9e16319a3895f88e74f3b4dea012516df8a75cdc',
          network: 'linea',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.isMoneyAccountDestination).toBe(false);
    });

    it('ignores Monad entries when resolving a Linea destination', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x5b16dce915ee64319136a22e9ab01515c18646df',
          currency: 'veda',
          network: 'monad',
          priority: 0,
        }),
        priorityEntry({
          address: '0xlinea111111111111111111111111111111111111',
          currency: 'usdc',
          network: 'linea',
          priority: 5,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.receivingAddress).toBe(
        '0xlinea111111111111111111111111111111111111',
      );
      expect(result.current.isMoneyAccountDestination).toBe(false);
    });

    it('treats a Linea redemption as an external wallet destination', () => {
      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.isMoneyAccountDestination).toBe(false);
    });

    it('treats a VEDA token as a wallet when the user does not redeem to the Money account', () => {
      mockPrimaryMoneyAccount = undefined;

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.isMoneyAccountDestination).toBe(false);
    });
  });

  describe('destinations that cannot receive', () => {
    it('resolves no address when only a Solana wallet is linked', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          address: '4jepDb74MRJ3vFxCr53CyGbSk9Vsc9qbCCFPmc2wJfMh',
          currency: 'usdt',
          network: 'solana',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.receivingAddress).toBeUndefined();
    });

    it('marks the destination unapproved when only a Solana wallet is linked', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          address: '4jepDb74MRJ3vFxCr53CyGbSk9Vsc9qbCCFPmc2wJfMh',
          currency: 'usdt',
          network: 'solana',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.hasApprovedDestination).toBe(false);
    });

    it('keeps the destination resolved when the network is known but no wallet can receive', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          address: '4jepDb74MRJ3vFxCr53CyGbSk9Vsc9qbCCFPmc2wJfMh',
          currency: 'usdt',
          network: 'solana',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.isResolved).toBe(true);
      expect(result.current.receivingAddress).toBeUndefined();
    });

    it('resolves nothing before the estimation names a network', () => {
      mockExternalWalletPriority = [
        priorityEntry({
          address: '4jepDb74MRJ3vFxCr53CyGbSk9Vsc9qbCCFPmc2wJfMh',
          currency: 'usdt',
          network: 'solana',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd' }),
      );

      expect(result.current.isResolved).toBe(false);
      expect(result.current.receivingAddress).toBeUndefined();
    });

    it('resolves nothing for a network outside the supported list', () => {
      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'monad-testnet' }),
      );

      expect(result.current.isResolved).toBe(false);
      expect(result.current.caipChainId).toBeUndefined();
      expect(result.current.receivingAddress).toBeUndefined();
    });
  });

  describe('destination approval', () => {
    it('marks the destination unapproved when no address resolves even while a Money Account is delegated', () => {
      mockAnyMoneyAccountDelegated = true;
      mockExternalWalletPriority = [
        priorityEntry({
          address: '4jepDb74MRJ3vFxCr53CyGbSk9Vsc9qbCCFPmc2wJfMh',
          currency: 'usdt',
          network: 'solana',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.hasApprovedDestination).toBe(false);
    });

    it('approves an external wallet destination when funding is approved for that network and symbol', () => {
      mockAnyMoneyAccountDelegated = false;
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x9e16319a3895f88e74f3b4dea012516df8a75cdc',
          currency: 'usdc',
          network: 'linea',
          priority: 1,
        }),
      ];
      mockFundingTokens = [
        fundingToken({
          caipChainId: 'eip155:59144' as CaipChainId,
          symbol: 'musd',
          fundingStatus: FundingStatus.Enabled,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.hasApprovedDestination).toBe(true);
    });

    it('approves a Linea destination when a receiving wallet exists and any Money Account is delegated', () => {
      mockAnyMoneyAccountDelegated = true;
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x9e16319a3895f88e74f3b4dea012516df8a75cdc',
          network: 'linea',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.hasApprovedDestination).toBe(true);
    });

    it('requires setup for a Linea destination when no Money Account is delegated and no funding is approved', () => {
      mockAnyMoneyAccountDelegated = false;
      mockExternalWalletPriority = [
        priorityEntry({
          address: '0x9e16319a3895f88e74f3b4dea012516df8a75cdc',
          network: 'linea',
          priority: 1,
        }),
      ];

      const { result } = renderHook(() =>
        useRedeemDestination({ currency: 'musd', network: 'linea' }),
      );

      expect(result.current.hasApprovedDestination).toBe(false);
    });
  });
});
