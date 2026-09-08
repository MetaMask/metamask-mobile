import { renderHook } from '@testing-library/react-native';
import type { ClaimDto } from '../../../../../core/Engine/controllers/rewards-money-controller/types';
import { navigateToTransactionDetails } from '../../../../../util/navigation/navigateToTransactionDetails';
import { resolveClaimTransaction } from '../utils/resolveClaimTransaction';
import { useClaimRowPress } from './useClaimRowPress';

const mockNavigation = { navigate: jest.fn() };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));

// Selectors are called with no store, so the hook's `useSelector` is stubbed to
// invoke them directly and each is mocked to a fixed value.
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => (selector as () => unknown)(),
}));

jest.mock('../../../../../selectors/transactionController', () => ({
  selectSortedTransactions: jest.fn(() => []),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyAccountVaultConfig: jest.fn(() => ({ chainId: '0x8f' })),
  }),
);

jest.mock(
  '../../../../../util/navigation/navigateToTransactionDetails',
  () => ({
    navigateToTransactionDetails: jest.fn(),
  }),
);

jest.mock('../utils/resolveClaimTransaction', () => ({
  resolveClaimTransaction: jest.fn(),
}));

import { selectMoneyAccountVaultConfig } from '../../../../../selectors/featureFlagController/moneyAccount';

const mockedResolve = jest.mocked(resolveClaimTransaction);
const mockedNavigate = jest.mocked(navigateToTransactionDetails);
const mockedVaultConfig = jest.mocked(selectMoneyAccountVaultConfig);

const CLAIM = { id: 'claim-1' } as ClaimDto;

describe('useClaimRowPress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedVaultConfig.mockReturnValue({ chainId: '0x8f' } as ReturnType<
      typeof selectMoneyAccountVaultConfig
    >);
  });

  it('navigates to the resolved transaction on press', () => {
    mockedResolve.mockReturnValue({ kind: 'exact', transactionId: 'tx-1' });
    const { result } = renderHook(() => useClaimRowPress());

    const press = result.current(CLAIM);
    press?.onPress();

    expect(press?.isInferredMatch).toBe(false);
    expect(mockedNavigate).toHaveBeenCalledWith(mockNavigation, {
      transactionId: 'tx-1',
    });
  });

  it('flags an inferred match so the row can soften its label', () => {
    mockedResolve.mockReturnValue({ kind: 'inferred', transactionId: 'tx-2' });
    const { result } = renderHook(() => useClaimRowPress());

    expect(result.current(CLAIM)?.isInferredMatch).toBe(true);
  });

  /** A null is what makes the row inert rather than a tap that goes nowhere. */
  it('returns null when nothing can be opened', () => {
    mockedResolve.mockReturnValue({ kind: 'none' });
    const { result } = renderHook(() => useClaimRowPress());

    expect(result.current(CLAIM)).toBeNull();
  });

  /**
   * Without a vault config there is no chain to scope the search to, so
   * resolving would be guesswork across every network.
   */
  it('returns null when the vault config is unavailable', () => {
    mockedVaultConfig.mockReturnValue(
      undefined as unknown as ReturnType<typeof selectMoneyAccountVaultConfig>,
    );
    const { result } = renderHook(() => useClaimRowPress());

    expect(result.current(CLAIM)).toBeNull();
    expect(mockedResolve).not.toHaveBeenCalled();
  });
});
