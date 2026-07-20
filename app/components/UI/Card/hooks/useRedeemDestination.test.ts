import { renderHook } from '@testing-library/react-native';
import useRedeemDestination from './useRedeemDestination';

let mockAnyMoneyAccountDelegated = true;
let mockExternalWalletPriority: unknown[] = [];
let mockIsResidencyBlocked = false;
let mockPrimaryMoneyAccount: unknown = { address: '0xprimary' };

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
  selectCardFundingTokens: jest.fn(() => []),
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

describe('useRedeemDestination', () => {
  beforeEach(() => {
    mockIsResidencyBlocked = false;
    mockPrimaryMoneyAccount = { address: '0xprimary' };
    mockAnyMoneyAccountDelegated = true;
    mockExternalWalletPriority = [];
  });

  it('resolves a Money account destination when the user redeems to the Money account', () => {
    const { result } = renderHook(() =>
      useRedeemDestination({ currency: 'musd', network: 'linea' }),
    );

    expect(result.current.isMoneyAccountDestination).toBe(true);
  });

  it('treats a VEDA token as a wallet when the user does not redeem to the Money account', () => {
    mockPrimaryMoneyAccount = undefined;

    const { result } = renderHook(() =>
      useRedeemDestination({ currency: 'musd', network: 'linea' }),
    );

    expect(result.current.isMoneyAccountDestination).toBe(false);
  });

  it('approves an MA destination when any Money Account is delegated', () => {
    mockAnyMoneyAccountDelegated = true;

    const { result } = renderHook(() =>
      useRedeemDestination({ currency: 'musd', network: 'linea' }),
    );

    expect(result.current.hasApprovedDestination).toBe(true);
  });

  it('requires setup for an MA destination when no Money Account is delegated', () => {
    mockAnyMoneyAccountDelegated = false;

    const { result } = renderHook(() =>
      useRedeemDestination({ currency: 'musd', network: 'linea' }),
    );

    expect(result.current.hasApprovedDestination).toBe(false);
  });

  it('resolves the highest-priority external wallet for the destination network', () => {
    mockExternalWalletPriority = [
      {
        id: 1,
        address: '0x9e16319a3895f88e74f3b4dea012516df8a75cdc',
        currency: 'steur',
        network: 'linea',
        priority: 1,
      },
      {
        id: 2,
        address: '0xlowpriority000000000000000000000000000002',
        currency: 'usdc',
        network: 'linea',
        priority: 2,
      },
      {
        id: 3,
        address: '0x5b16dce915ee64319136a22e9ab01515c18646df',
        currency: 'veda',
        network: 'monad',
        priority: 0,
      },
    ];

    const { result } = renderHook(() =>
      useRedeemDestination({ currency: 'musd', network: 'linea' }),
    );

    expect(result.current.receivingAddress).toBe(
      '0x9e16319a3895f88e74f3b4dea012516df8a75cdc',
    );
    expect(result.current.isMoneyAccountDestination).toBe(false);
  });

  it('identifies a Money Account destination from a veda/monad priority entry', () => {
    mockExternalWalletPriority = [
      {
        id: 1,
        address: '0x5b16dce915ee64319136a22e9ab01515c18646df',
        currency: 'veda',
        network: 'monad',
        priority: 1,
      },
    ];

    const { result } = renderHook(() =>
      useRedeemDestination({ currency: 'musd', network: 'monad' }),
    );

    expect(result.current.isMoneyAccountDestination).toBe(true);
  });
});
