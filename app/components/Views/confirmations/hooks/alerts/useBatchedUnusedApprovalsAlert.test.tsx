import BigNumber from 'bignumber.js';
import {
  NestedTransactionMetadata,
  SimulationData,
  SimulationErrorCode,
  SimulationTokenBalanceChange,
  SimulationTokenStandard,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { PreferencesState } from '@metamask/preferences-controller';
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
import { ApproveMethod } from '../../types/approve';
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

// function runHook(transactionMeta?: TransactionMeta, preferenceState?: Partial<PreferencesState>) {
//   const { result, rerender } = renderHookWithProvider(useBatchedUnusedApprovalsAlert, {
//     state: {
//       ...getAppStateForConfirmation(transactionMeta ?? batchApprovalConfirmation),
//       engine: {
//         backgroundState: {
//           RemoteFeatureFlagController: {
//             remoteFeatureFlags: {
//               nonZeroUnusedApprovals: ['https://allowed-origin.com'],
//             },
//           },
//           ...(preferenceState ?? {}),
//         },
//       },
//     },
//   });
//   return { result, rerender };
// }

function runHook(
  transactionMeta?: TransactionMeta,
  preferenceState?: Partial<PreferencesState>,
) {
  const state = getAppStateForConfirmation(
    transactionMeta ?? batchApprovalConfirmation,
  );
  const { result, rerender } = renderHookWithProvider(
    useBatchedUnusedApprovalsAlert,
    {
      state: {
        ...state,
        engine: {
          ...state.engine,
          backgroundState: {
            ...state.engine.backgroundState,
            RemoteFeatureFlagController: {
              ...state.engine.backgroundState.RemoteFeatureFlagController,
              remoteFeatureFlags: {
                ...state.engine.backgroundState.RemoteFeatureFlagController
                  .remoteFeatureFlags,
                nonZeroUnusedApprovals: ['https://allowed-origin.com'],
              },
            },
            ...preferenceState,
          },
        },
      },
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
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: {
          tokenBalanceChanges: [],
        } as unknown as SimulationData,
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
          name: ApproveMethod.APPROVE,
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
          name: ApproveMethod.APPROVE,
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
          name: ApproveMethod.INCREASE_ALLOWANCE,
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
          name: ApproveMethod.SET_APPROVAL_FOR_ALL,
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
          name: ApproveMethod.SET_APPROVAL_FOR_ALL,
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
          name: ApproveMethod.APPROVE,
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
          name: ApproveMethod.APPROVE,
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
          name: 'unsupportedMethod' as ApproveMethod, // unsupported
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
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('2000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: ApproveMethod.APPROVE,
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
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('2000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        })
        .mockReturnValueOnce({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('2000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: {
          tokenBalanceChanges: simulationData,
        } as unknown as SimulationData,
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
          name: ApproveMethod.APPROVE,
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
          name: ApproveMethod.APPROVE,
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
          name: ApproveMethod.APPROVE,
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

    it('does not show alert when simulation data is missing', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: undefined, // Missing simulation data
      });

      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    it('does not show alert when simulation data has no token balance changes', async () => {
      const nestedTransactions = [
        createMockNestedTransaction('0x123', TOKEN_ADDRESS_1),
      ];

      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: {
          tokenBalanceChanges: undefined, // Missing token balance changes
        } as unknown as SimulationData,
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
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });

      const { result } = runHook({
        ...batchApprovalConfirmation,
        nestedTransactions,
        simulationData: {
          tokenBalanceChanges: [],
        } as unknown as SimulationData,
      });

      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });
  });

  describe('simulation errors', () => {
    beforeEach(() => {
      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });
    });
    it('does not show alert when simulation is disabled via preferences', async () => {
      const { result } = runHook(
        { ...batchApprovalConfirmation, simulationData: undefined },
        { preferencesController: { useTransactionSimulations: false } },
      );
      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    it.each([
      SimulationErrorCode.ChainNotSupported,
      SimulationErrorCode.Disabled,
    ])(
      'does not show alert when simulation returned error %s',
      async (errorCode) => {
        const simulationData: SimulationData = {
          error: { code: errorCode },
        } as SimulationData;

        const { result } = runHook({
          ...batchApprovalConfirmation,
          simulationData,
        });

        await waitFor(() => {
          expect(result.current).toEqual([]);
        });
      },
    );

    it('shows alert when simulation is enabled and supported', async () => {
      const simulationData: SimulationData = {
        tokenBalanceChanges: [{ address: TOKEN_ADDRESS_1, isDecrease: true }],
      } as SimulationData;
      const { result } = runHook({
        ...batchApprovalConfirmation,
        simulationData,
      });
      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });
  });

  describe('Non zero unused approvals', () => {
    beforeEach(() => {
      jest
        .spyOn(ApprovalUtils, 'parseApprovalTransactionData')
        .mockReturnValue({
          name: ApproveMethod.APPROVE,
          amountOrTokenId: new BigNumber('1000'),
          tokenAddress: undefined,
          isRevokeAll: false,
        });
    });

    it('does not show alert when origin is in the allow list', async () => {
      const { result } = runHook({
        ...batchApprovalConfirmation,
        origin: 'https://allowed-origin.com',
      });
      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });

    it('shows alert when origin is not in the allow list', async () => {
      const { result } = runHook({
        ...batchApprovalConfirmation,
        origin: 'https://not-allowed-origin.com',
      });
      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });

    it('shows alert when allow list is empty', async () => {
      const { result } = runHook({
        ...batchApprovalConfirmation,
        origin: 'https://not-allowed-origin.com',
      });
      await waitFor(() => {
        expect(result.current).toEqual(unusedApprovalsAlert);
      });
    });

    it('does not show alert when origin is undefined', async () => {
      const { result } = runHook({
        ...batchApprovalConfirmation,
        origin: undefined,
      });
      await waitFor(() => {
        expect(result.current).toEqual([]);
      });
    });
  });
});
