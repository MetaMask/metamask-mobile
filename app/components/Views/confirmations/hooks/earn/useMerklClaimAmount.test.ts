import { TransactionType } from '@metamask/transaction-controller';
import { merge } from 'lodash';
import { BigNumber } from 'bignumber.js';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { transferConfirmationState } from '../../../../../util/test/confirm-data-helpers';
import { MUSD_TOKEN_ADDRESS } from '../../../../UI/Earn/constants/musd';
import useMerklClaimAmount from './useMerklClaimAmount';

const USER_ADDRESS = '0x1234567890123456789012345678901234567890';
const OTHER_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';
const MERKL_DISTRIBUTOR_ADDRESS = '0x3Ef3D8bA38EBe18DB133cEc108f4D14CE00Dd9Ae';
const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const CONVERSION_RATE = new BigNumber(3596.25);
const USD_CONVERSION_RATE = 3596.25;

const padAddress = (address: string) =>
  `0x${address.slice(2).toLowerCase().padStart(64, '0')}`;

const makeTransferLog = (from: string, to: string, amount: bigint) => ({
  address: MUSD_TOKEN_ADDRESS,
  topics: [TRANSFER_TOPIC, padAddress(from), padAddress(to)],
  data: `0x${amount.toString(16).padStart(64, '0')}`,
});

const createMusdClaimState = (logs: ReturnType<typeof makeTransferLog>[]) =>
  merge({}, transferConfirmationState, {
    engine: {
      backgroundState: {
        TransactionController: {
          transactions: [
            {
              type: TransactionType.musdClaim,
              txParams: {
                from: USER_ADDRESS,
              },
              txReceipt: {
                logs,
              },
            },
          ],
        },
      },
    },
  });

const renderUseMerklClaimAmount = (state: typeof transferConfirmationState) => {
  const transaction =
    state.engine.backgroundState.TransactionController.transactions[0];

  return renderHookWithProvider(
    () =>
      useMerklClaimAmount(
        transaction as Parameters<typeof useMerklClaimAmount>[0],
        CONVERSION_RATE,
        USD_CONVERSION_RATE,
      ),
    { state },
  );
};

describe('useMerklClaimAmount', () => {
  it('returns the payout extracted from the receipt Transfer log', () => {
    const state = createMusdClaimState([
      makeTransferLog(MERKL_DISTRIBUTOR_ADDRESS, USER_ADDRESS, 70000000n),
    ]);

    const { result } = renderUseMerklClaimAmount(state);
    expect(result.current.claimAmount?.claimAmountDecimal.toString()).toBe(
      '70',
    );
  });

  it('returns null when no Transfer log comes from the distributor', () => {
    const state = createMusdClaimState([
      makeTransferLog(OTHER_ADDRESS, USER_ADDRESS, 70000000n),
    ]);

    const { result } = renderUseMerklClaimAmount(state);
    expect(result.current.claimAmount).toBeNull();
  });

  it('returns null when the receipt has no logs', () => {
    const state = createMusdClaimState([]);

    const { result } = renderUseMerklClaimAmount(state);
    expect(result.current.claimAmount).toBeNull();
  });

  it('returns null for non-musdClaim transactions', () => {
    const { result } = renderUseMerklClaimAmount(transferConfirmationState);
    expect(result.current.claimAmount).toBeNull();
  });
});
