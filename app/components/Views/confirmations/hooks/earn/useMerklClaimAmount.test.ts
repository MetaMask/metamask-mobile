import { TransactionType } from '@metamask/transaction-controller';
import { Interface } from '@ethersproject/abi';
import { merge } from 'lodash';
import { waitFor } from '@testing-library/react-native';
import { BigNumber } from 'bignumber.js';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { DISTRIBUTOR_CLAIM_ABI } from '../../../../UI/Earn/components/MerklRewards/constants';
import { getClaimedAmountFromContract } from '../../../../UI/Earn/components/MerklRewards/merkl-client';
import useMerklClaimAmount from './useMerklClaimAmount';

jest.mock('../../../../UI/Earn/components/MerklRewards/merkl-client', () => ({
  getClaimedAmountFromContract: jest.fn().mockResolvedValue('0'),
}));

const USER_ADDRESS = '0x1234567890123456789012345678901234567890';
const TOKEN_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

const encodeClaimData = (amount: string): string => {
  const contractInterface = new Interface(DISTRIBUTOR_CLAIM_ABI);
  return contractInterface.encodeFunctionData('claim', [
    [USER_ADDRESS],
    [TOKEN_ADDRESS],
    [amount],
    [[]],
  ]);
};

const createMusdClaimState = (claimData: string) =>
  merge({}, transferConfirmationState, {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              type: TransactionType.musdClaim,
              txParams: {
                data: claimData,
                from: USER_ADDRESS,
              },
            },
          ],
        },
      },
    },
  });

const CONVERSION_RATE = new BigNumber(3596.25);
const USD_CONVERSION_RATE = 3596.25;

const getClaimedAmountMock = jest.mocked(getClaimedAmountFromContract);

describe('useMerklClaimAmount', () => {
  beforeEach(() => {
    getClaimedAmountMock.mockResolvedValue('0');
  });

  it('returns pending while fetching claimed amount', () => {
    // Never resolve the mock to keep it pending
    getClaimedAmountMock.mockReturnValue(new Promise(() => null));

    const claimData = encodeClaimData('50000000');
    const state = createMusdClaimState(claimData);
    const transaction =
      state.engine.backgroundState.TransactionController.transactions[0];

    const { result } = renderHookWithProvider(
      () =>
        useMerklClaimAmount(
          transaction as Parameters<typeof useMerklClaimAmount>[0],
          CONVERSION_RATE,
          USD_CONVERSION_RATE,
        ),
      { state },
    );

    expect(result.current.pending).toBe(true);
    expect(result.current.claimAmount).toBeNull();
  });

  it('returns null for non-musdClaim transactions', async () => {
    const state = merge({}, transferConfirmationState);
    const transaction =
      state.engine.backgroundState.TransactionController.transactions[0];

    const { result } = renderHookWithProvider(
      () =>
        useMerklClaimAmount(
          transaction as Parameters<typeof useMerklClaimAmount>[0],
          CONVERSION_RATE,
          USD_CONVERSION_RATE,
        ),
      { state },
    );

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      expect(result.current.claimAmount).toBeNull();
    });
  });

  it('computes unclaimed = total - claimed', async () => {
    const totalAmount = '100000000'; // 100 mUSD
    const claimedAmount = '30000000'; // 30 mUSD already claimed
    getClaimedAmountMock.mockResolvedValue(claimedAmount);

    const claimData = encodeClaimData(totalAmount);
    const state = createMusdClaimState(claimData);
    const transaction =
      state.engine.backgroundState.TransactionController.transactions[0];

    const { result } = renderHookWithProvider(
      () =>
        useMerklClaimAmount(
          transaction as Parameters<typeof useMerklClaimAmount>[0],
          CONVERSION_RATE,
          USD_CONVERSION_RATE,
        ),
      { state },
    );

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      expect(result.current.claimAmount).not.toBeNull();
      // 100 - 30 = 70 mUSD
      expect(result.current.claimAmount?.claimAmountDecimal.toString()).toBe(
        '70',
      );
    });
  });

  it('returns zero when claimed >= total', async () => {
    const totalAmount = '50000000'; // 50 mUSD
    getClaimedAmountMock.mockResolvedValue('50000000'); // fully claimed

    const claimData = encodeClaimData(totalAmount);
    const state = createMusdClaimState(claimData);
    const transaction =
      state.engine.backgroundState.TransactionController.transactions[0];

    const { result } = renderHookWithProvider(
      () =>
        useMerklClaimAmount(
          transaction as Parameters<typeof useMerklClaimAmount>[0],
          CONVERSION_RATE,
          USD_CONVERSION_RATE,
        ),
      { state },
    );

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      expect(result.current.claimAmount?.claimAmountDecimal.toString()).toBe(
        '0',
      );
    });
  });

  it('falls back to zero claimed when contract call returns null', async () => {
    getClaimedAmountMock.mockResolvedValue(null);

    const totalAmount = '50000000'; // 50 mUSD
    const claimData = encodeClaimData(totalAmount);
    const state = createMusdClaimState(claimData);
    const transaction =
      state.engine.backgroundState.TransactionController.transactions[0];

    const { result } = renderHookWithProvider(
      () =>
        useMerklClaimAmount(
          transaction as Parameters<typeof useMerklClaimAmount>[0],
          CONVERSION_RATE,
          USD_CONVERSION_RATE,
        ),
      { state },
    );

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      // Falls back to claimed=0, so unclaimed = 50
      expect(result.current.claimAmount?.claimAmountDecimal.toString()).toBe(
        '50',
      );
    });
  });

  it('returns null claimAmount for invalid claim data', async () => {
    const state = createMusdClaimState('0x123456');
    const transaction =
      state.engine.backgroundState.TransactionController.transactions[0];

    const { result } = renderHookWithProvider(
      () =>
        useMerklClaimAmount(
          transaction as Parameters<typeof useMerklClaimAmount>[0],
          CONVERSION_RATE,
          USD_CONVERSION_RATE,
        ),
      { state },
    );

    await waitFor(() => {
      expect(result.current.pending).toBe(false);
      expect(result.current.claimAmount).toBeNull();
    });
  });
});
