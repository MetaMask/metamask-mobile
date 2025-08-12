import BigNumber from 'bignumber.js';
import {
  NestedTransactionMetadata,
  SimulationData,
  SimulationTokenBalanceChange,
  SimulationTokenStandard,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { waitFor } from '@testing-library/react-native';

import {
  batchApprovalConfirmation,
  getAppStateForConfirmation,
  upgradeAccountConfirmation,
  upgradeOnlyAccountConfirmation,
} from '../../../../../util/test/confirm-data-helpers';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import { AlertKeys } from '../../constants/alerts';
// eslint-disable-next-line import/no-namespace
import * as ApprovalUtils from '../../utils/approvals';
// eslint-disable-next-line import/no-namespace
import * as TokenUtils from '../../utils/token';
import { RowAlertKey } from '../../components/UI/info-row/alert-row/constants';
import { Severity } from '../../types/alerts';
import { useBatchedUnusedApprovalsAlert } from './useBatchedUnusedApprovalsAlert';
import { TokenStandard } from '../../../../UI/SimulationDetails/types';

const TOKEN_ADDRESS_1 = '0x1234567890123456789012345678901234567890' as Hex;
const TOKEN_ADDRESS_2 = '0x2345678901234567890123456789012345678901' as Hex;
const SPENDER_ADDRESS = '0x3456789012345678901234567890123456789012' as Hex;

const createMockNestedTransaction = (
  data: string,
  to: Hex,
): NestedTransactionMetadata => ({
  data: data as Hex,
  to,
  value: '0x0',
  gas: '0x5208',
});

const createMockSimulationChange = (
  address: Hex,
  difference: string,
  isDecrease: boolean,
): SimulationTokenBalanceChange => ({
  address,
  difference: difference as Hex,
  isDecrease,
  previousBalance: '0x0',
  newBalance: '0x0',
  standard: SimulationTokenStandard.erc20,
});

const unusedApprovalsAlert = [
  {
    isBlocking: false,
    field: RowAlertKey.BatchedApprovals,
    key: AlertKeys.BatchedUnusedApprovals,
    title: 'Unnecessary permission',
    message:
      "You're giving someone else permission to withdraw your tokens, even though it's not necessary for this transaction.",
    severity: Severity.Danger,
    skipConfirmation: true,
  },
];

function runHook(transactionMeta?: TransactionMeta) {
  const { result, rerender } = renderHookWithProvider(
    useBatchedUnusedApprovalsAlert,
    {
      state: getAppStateForConfirmation(
        transactionMeta ?? batchApprovalConfirmation,
      ),
    },
  );
  return { result, rerender };
}

describe('useBatchedUnusedApprovalsAlert', () => {
  it('returns no alerts when no confirmation exists', () => {
    const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
      state: {
        engine: {
          backgroundState,
        },
      },
    });
    expect(response.result.current).toEqual([]);
  });

  it('returns no alerts if confirmation does not have nested transactions', () => {
    const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
      state: getAppStateForConfirmation(upgradeOnlyAccountConfirmation),
    });
    expect(response.result.current).toEqual([]);
  });

  it('returns no alerts if when no approve balance changes exist', () => {
    const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
      state: getAppStateForConfirmation(upgradeAccountConfirmation),
    });
    expect(response.result.current).toEqual([]);
  });

  it('returns no alerts if when approvals are used', () => {
    const response = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
      state: getAppStateForConfirmation(batchApprovalConfirmation),
    });
    expect(response.result.current).toEqual([]);
  });

  describe('when approvals are unused (no corresponding outflows)', () => {
    it('returns alert for unused approvals', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: [] as unknown as SimulationData, // no outflows
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });
  });

  describe('approval parsing scenarios', () => {
    it('handles regular ERC20 approve', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined, // regular approve
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });

    it('handles Permit2 approve', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', SPENDER_ADDRESS),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: TOKEN_ADDRESS_1, // Permit2 approve
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });

    it('handles increaseAllowance', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'increaseAllowance',
          amountOrTokenId: new BigNumber('500'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });

    it('handles setApprovalForAll', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'setApprovalForAll',
          amountOrTokenId: new BigNumber('1'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });
  });

  describe('approval skipping scenarios', () => {
    it('skips setApprovalForAll revocations', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'setApprovalForAll',
          amountOrTokenId: new BigNumber('0'),
          tokenAddress: undefined,
          isRevokeAll: true, // revocation
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    it('skips ERC20 zero amount approvals (revocations)', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('0'), // zero amount
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      jest
        .spyOn(TokenUtils, 'memoizedGetTokenStandardAndDetails')
        .mockResolvedValue({
          standard: TokenStandard.ERC20,
        } as TokenUtils.TokenDetails);

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    it('does not skip ERC721 token ID 0 approvals', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('0'), // token ID 0 for NFT
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      jest
        .spyOn(TokenUtils, 'memoizedGetTokenStandardAndDetails')
        .mockResolvedValue({
          standard: TokenStandard.ERC721,
        } as TokenUtils.TokenDetails);

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });

    it('skips transactions with no data', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('', TOKEN_ADDRESS_1), // no data
      ];

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    it('skips transactions with unparseable data', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue(undefined);

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    it('skips unsupported approval methods', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'unsupportedMethod', // unsupported
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });
  });

  describe('multiple approvals scenarios', () => {
    it('handles multiple unused approvals', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
        createMockNestedTransaction('0x456', TOKEN_ADDRESS_2),
      ];

      // parseApprovalTransactionData gets called multiple times:
      // 1. Once for each transaction in getUniqueTokenAddresses (2 calls)
      // 2. Once for each transaction in extractApprovals (2 calls)
      // So we need to set up 4 return values
      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValueOnce({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: 'approve',
          amountOrTokenId: new BigNumber('2000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: 'approve',
          amountOrTokenId: new BigNumber('2000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });

    it('handles mixed used and unused approvals', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
        createMockNestedTransaction('0x456', TOKEN_ADDRESS_2),
      ];

      const simulationData = [
        createMockSimulationChange(TOKEN_ADDRESS_1, '0x64', true), // used
        // TOKEN_ADDRESS_2 has no outflow - unused
      ];

      // parseApprovalTransactionData gets called 4 times:
      // 1. Once for each transaction in getUniqueTokenAddresses (2 calls)
      // 2. Once for each transaction in extractApprovals (2 calls)
      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValueOnce({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: 'approve',
          amountOrTokenId: new BigNumber('2000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: 'approve',
          amountOrTokenId: new BigNumber('2000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: simulationData as unknown as SimulationData,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });
  });

  describe('token standard handling', () => {
    it('handles token standard fetch failure gracefully', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      jest
        .spyOn(TokenUtils, 'memoizedGetTokenStandardAndDetails')
        .mockRejectedValue(new Error('Network error'));

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });

    it('handles invalid token standard gracefully', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      jest
        .spyOn(TokenUtils, 'memoizedGetTokenStandardAndDetails')
        .mockResolvedValue({
          standard: 'INVALID_STANDARD' as TokenStandard,
        } as TokenUtils.TokenDetails);

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });
  });

  describe('edge cases', () => {
    it('handles case-insensitive token address matching', async () => {
      const nestedTransactions = [
        createMockNestedTransaction(
          '0x123',
          TOKEN_ADDRESS_1.toUpperCase() as Hex,
        ),
      ];

      const simulationData = [
        createMockSimulationChange(
          TOKEN_ADDRESS_1.toLowerCase() as Hex,
          '0x64',
          true,
        ),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: simulationData as unknown as SimulationData,
      });

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    it('handles empty simulation data array', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: 'approve',
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: undefined,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });
  });
});
