import { renderHook, waitFor } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useIsMoneyAccount7702Ready } from './useIsMoneyAccount7702Ready';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockIsAtomicBatchSupported = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      TransactionController: {
        isAtomicBatchSupported: (...args: unknown[]) =>
          mockIsAtomicBatchSupported(...args),
      },
    },
  },
}));

jest.mock('../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));
jest.mock('../../../../selectors/featureFlagController/moneyAccount', () => ({
  selectMoneyAccountVaultConfig: jest.fn(),
}));

import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';

const mockUseSelector = useSelector as unknown as jest.Mock;

const ADDRESS = '0xabc1111111111111111111111111111111111111';
const CHAIN_ID = '0x8f';

const applySelectors = ({
  address,
  chainId,
}: {
  address?: string;
  chainId?: string;
}) => {
  mockUseSelector.mockImplementation((selector: unknown) => {
    if (selector === selectPrimaryMoneyAccount)
      return address ? { address } : undefined;
    if (selector === selectMoneyAccountVaultConfig)
      return chainId ? { chainId } : undefined;
    return undefined;
  });
};

describe('useIsMoneyAccount7702Ready', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns undefined while the isAtomicBatchSupported call is in flight', () => {
    applySelectors({ address: ADDRESS, chainId: CHAIN_ID });
    // Never-resolving promise so the hook stays in the pending state for the
    // duration of this test.
    mockIsAtomicBatchSupported.mockReturnValue(new Promise(() => undefined));

    const { result } = renderHook(() => useIsMoneyAccount7702Ready());

    expect(result.current).toBeUndefined();
  });

  it('returns true when the controller reports the chain is supported', async () => {
    applySelectors({ address: ADDRESS, chainId: CHAIN_ID });
    mockIsAtomicBatchSupported.mockResolvedValue([
      { chainId: CHAIN_ID, isSupported: true },
    ]);

    const { result } = renderHook(() => useIsMoneyAccount7702Ready());

    await waitFor(() => expect(result.current).toBe(true));
    expect(mockIsAtomicBatchSupported).toHaveBeenCalledWith({
      address: ADDRESS,
      chainIds: [CHAIN_ID],
    });
  });

  it('returns false when the controller reports isSupported: false', async () => {
    applySelectors({ address: ADDRESS, chainId: CHAIN_ID });
    mockIsAtomicBatchSupported.mockResolvedValue([
      { chainId: CHAIN_ID, isSupported: false },
    ]);

    const { result } = renderHook(() => useIsMoneyAccount7702Ready());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('returns false when the controller response is missing the requested chain', async () => {
    // The TransactionController only echoes chains it knows about — a missing
    // entry must be treated as "not supported", not "unknown".
    applySelectors({ address: ADDRESS, chainId: CHAIN_ID });
    mockIsAtomicBatchSupported.mockResolvedValue([]);

    const { result } = renderHook(() => useIsMoneyAccount7702Ready());

    await waitFor(() => expect(result.current).toBe(false));
  });

  it('returns false without calling the controller when there is no primary money account', async () => {
    applySelectors({ address: undefined, chainId: CHAIN_ID });

    const { result } = renderHook(() => useIsMoneyAccount7702Ready());

    await waitFor(() => expect(result.current).toBe(false));
    expect(mockIsAtomicBatchSupported).not.toHaveBeenCalled();
  });

  it('returns false without calling the controller when there is no vault chain id', async () => {
    applySelectors({ address: ADDRESS, chainId: undefined });

    const { result } = renderHook(() => useIsMoneyAccount7702Ready());

    await waitFor(() => expect(result.current).toBe(false));
    expect(mockIsAtomicBatchSupported).not.toHaveBeenCalled();
  });
});
