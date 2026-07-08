/*
 * Vendored from metamask-extension shared/lib/activity/adapters/local-transaction.ts
 * Branch: origin/n3ps/activity-v3-prototype
 * TODO: Replace with shared @metamask/activity-adapters package when published.
 *
 * Extension dependencies are provided via ActivityAdapterEnvironment.
 */
import { TransactionType } from '@metamask/transaction-controller';
import { KnownCaipNamespace, toCaipChainId, type Hex } from '@metamask/utils';
import { getClaimPayoutFromReceipt } from '../../../components/UI/Earn/utils/musd';
import {
  MUSD_DECIMALS,
  MUSD_TOKEN,
  MUSD_TOKEN_ADDRESS,
  MUSD_TOKEN_ASSET_ID_BY_CHAIN,
} from '../../../components/UI/Earn/constants/musd';
import type { ActivityListItem, TokenAmount } from '../types';
import type { TransactionGroup } from './transaction-group';
import {
  supplyMethodIds,
  unwrapMethodIds,
  withdrawMethodIds,
  wrapMethodIds,
} from './constants';
import {
  getKnownTokenMetadata,
  getLocalTransactionStatus,
  getTokenApprovalAmountFromData,
} from './helpers';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './environment';

const EVM_NATIVE_DECIMALS = 18;

// Converts local TransactionController groups into activity items
export function mapLocalTransaction(
  transactionGroup: TransactionGroup,
  environment: ActivityAdapterEnvironment = mobileActivityAdapterEnvironment,
): ActivityListItem {
  const { initialTransaction, primaryTransaction } = transactionGroup;
  const chainId = toCaipChainId(
    KnownCaipNamespace.Eip155,
    Number.parseInt(initialTransaction.chainId, 16).toString(),
  );
  const nativeAsset = environment.getNativeAssetForChainId(
    initialTransaction.chainId,
  );
  // Prefer the network-configured ticker (resolved by the selector from
  // NetworkController state) over the bridge-controller swaps registry,
  // which hard-codes synthetic symbols like `TESTETH` for chains such as
  // Localhost (0x539) regardless of how the user configured the network.
  const nativeSymbol =
    transactionGroup.nativeAssetSymbol ?? nativeAsset?.symbol;

  const getNativeToken = (
    transaction: TransactionGroup['initialTransaction'],
    direction: TokenAmount['direction'],
  ) => {
    if (nativeSymbol === undefined) {
      return undefined;
    }

    return {
      direction,
      symbol: nativeSymbol,
      ...(transaction.txParams.value
        ? { amount: transaction.txParams.value }
        : {}),
      ...(nativeAsset?.assetId ? { assetId: nativeAsset.assetId } : {}),
      decimals: nativeAsset?.decimals ?? EVM_NATIVE_DECIMALS,
    };
  };

  const getContractToken = ({
    amount,
    contractAddress,
    direction,
    transaction,
  }: {
    amount?: string;
    contractAddress?: string;
    direction: TokenAmount['direction'];
    transaction: TransactionGroup['initialTransaction'];
  }) => {
    if (contractAddress === undefined) {
      return undefined;
    }

    const tokenMetadata = getKnownTokenMetadata(
      chainId,
      contractAddress,
      environment,
    );
    const decimals =
      transaction.transferInformation?.amount === undefined
        ? (tokenMetadata?.decimals ??
          transactionGroup.contractTokenMetadata?.decimals)
        : transaction.transferInformation.decimals;
    const tokenAmount = transaction.transferInformation?.amount ?? amount;
    const symbol =
      transaction.transferInformation?.symbol ??
      tokenMetadata?.symbol ??
      transactionGroup.contractTokenMetadata?.symbol;
    const assetId = environment.toAssetId(contractAddress, chainId);

    return {
      direction,
      ...(symbol ? { symbol } : {}),
      ...(assetId ? { assetId } : {}),
      ...(tokenAmount ? { amount: tokenAmount } : {}),
      ...(decimals === undefined ? {} : { decimals }),
    };
  };

  const getLegacySwapToken = (direction: TokenAmount['direction']) => {
    const { value } = initialTransaction.txParams;
    let hasNativeValue = false;

    if (value !== undefined && value !== '') {
      try {
        hasNativeValue = BigInt(value) > 0n;
      } catch {
        hasNativeValue = false;
      }
    }

    let symbol: string | undefined;

    if (direction === 'out') {
      symbol =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (initialTransaction as any).sourceTokenSymbol ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (primaryTransaction as any).sourceTokenSymbol ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (initialTransaction as any).swapMetaData?.token_from ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (primaryTransaction as any).swapMetaData?.token_from ??
        (hasNativeValue ? nativeSymbol : undefined);
    } else {
      symbol =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (initialTransaction as any).destinationTokenSymbol ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (primaryTransaction as any).destinationTokenSymbol ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (initialTransaction as any).swapMetaData?.token_to ??
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (primaryTransaction as any).swapMetaData?.token_to;
    }

    if (symbol === undefined) {
      return undefined;
    }

    return {
      direction,
      symbol,
      ...(symbol === nativeSymbol && nativeAsset?.assetId
        ? { assetId: nativeAsset.assetId }
        : {}),
    };
  };

  const status =
    transactionGroup.activityStatus ??
    getLocalTransactionStatus(
      {
        primaryTransaction,
        initialTransaction,
      },
      environment,
    );
  const timestamp = primaryTransaction.time ?? initialTransaction.time;
  const hash =
    primaryTransaction.hash ?? initialTransaction.hash ?? primaryTransaction.id;
  const from = initialTransaction.txParams.from ?? '';
  const to = initialTransaction.txParams.to ?? '';
  const methodId = initialTransaction.txParams.data?.slice(0, 10);
  const getDirectWrappedTokenActivity = (): ActivityListItem | undefined => {
    if (!methodId) {
      return undefined;
    }

    const wrappedTokenAddress =
      environment.wrappedTokenAddresses[initialTransaction.chainId];

    if (
      !wrappedTokenAddress ||
      !environment.equalsIgnoreCase(to, wrappedTokenAddress)
    ) {
      return undefined;
    }

    const normalizedMethodId = methodId.toLowerCase();
    const activityRaw = {
      type: 'localTransaction' as const,
      data: transactionGroup,
    };

    if (wrapMethodIds.has(normalizedMethodId)) {
      const { value: wrapAmount } = initialTransaction.txParams;

      try {
        if (wrapAmount && BigInt(wrapAmount) > 0n) {
          return {
            type: 'wrap',
            chainId,
            status,
            timestamp,
            hash,
            raw: activityRaw,
            data: {
              sourceToken: getNativeToken(initialTransaction, 'out'),
              destinationToken: getContractToken({
                amount: wrapAmount,
                transaction: initialTransaction,
                direction: 'in',
                contractAddress: wrappedTokenAddress,
              }),
            },
          };
        }
      } catch {
        return undefined;
      }
    }

    if (unwrapMethodIds.has(normalizedMethodId)) {
      const { data } = initialTransaction.txParams;
      let unwrapAmount: string | undefined;

      if (data && data.length >= 74) {
        try {
          unwrapAmount = BigInt(`0x${data.slice(10, 74)}`).toString();
        } catch {
          unwrapAmount = undefined;
        }
      }

      const nativeToken = getNativeToken(initialTransaction, 'in');

      return {
        type: 'unwrap',
        chainId,
        status,
        timestamp,
        hash,
        raw: activityRaw,
        data: {
          sourceToken: getContractToken({
            amount: unwrapAmount,
            transaction: initialTransaction,
            direction: 'out',
            contractAddress: wrappedTokenAddress,
          }),
          destinationToken:
            nativeToken && unwrapAmount
              ? { ...nativeToken, amount: unwrapAmount }
              : nativeToken,
        },
      };
    }

    return undefined;
  };

  const directWrappedTokenActivity = getDirectWrappedTokenActivity();
  if (directWrappedTokenActivity) {
    return directWrappedTokenActivity;
  }

  switch (initialTransaction.type) {
    case TransactionType.simpleSend: {
      return {
        type: 'send',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          from,
          to,
          token: getNativeToken(initialTransaction, 'out'),
        },
      };
    }

    case TransactionType.tokenMethodSafeTransferFrom:
    case TransactionType.tokenMethodTransfer:
    case TransactionType.tokenMethodTransferFrom: {
      const transactionData = initialTransaction.txParams.data
        ? environment.parseStandardTokenTransactionData(
            initialTransaction.txParams.data,
          )
        : undefined;
      const recipient = transactionData?.args?._to ?? transactionData?.args?.to;
      const amount =
        transactionData?.args?._value ?? transactionData?.args?.value;

      return {
        type: 'send',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          from,
          to: typeof recipient === 'string' ? recipient : to,
          token: getContractToken({
            amount: amount?.toString(),
            transaction: initialTransaction,
            direction: 'out',
            contractAddress: initialTransaction.txParams.to,
          }),
        },
      };
    }

    case TransactionType.incoming: {
      return {
        type: 'receive',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          from,
          to,
          token: initialTransaction.transferInformation?.contractAddress
            ? getContractToken({
                transaction: initialTransaction,
                direction: 'in',
                contractAddress:
                  initialTransaction.transferInformation.contractAddress,
              })
            : getNativeToken(initialTransaction, 'in'),
        },
      };
    }

    case TransactionType.swap:
    case TransactionType.swapAndSend: {
      const {
        sourceToken: enrichedSourceToken,
        destinationToken: enrichedDestinationToken,
      } = transactionGroup;
      const sourceToken = enrichedSourceToken ?? getLegacySwapToken('out');
      const destinationToken =
        enrichedDestinationToken ?? getLegacySwapToken('in');

      if (destinationToken?.symbol === undefined) {
        return {
          type: 'swapIncomplete',
          chainId,
          status,
          timestamp,
          hash,
          raw: { type: 'localTransaction', data: transactionGroup },
          data: {
            sourceToken,
          },
        };
      }

      return {
        type: 'swap',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          sourceToken,
          destinationToken,
        },
      };
    }

    case TransactionType.bridge: {
      const {
        sourceToken: enrichedSourceToken,
        destinationToken: enrichedDestinationToken,
      } = transactionGroup;
      return {
        type: 'bridge',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          sourceToken: enrichedSourceToken,
          destinationToken: enrichedDestinationToken,
        },
      };
    }

    case TransactionType.musdConversion: {
      const transactionData = initialTransaction.txParams.data
        ? environment.parseStandardTokenTransactionData(
            initialTransaction.txParams.data,
          )
        : undefined;
      const amount =
        transactionData?.args?._value ?? transactionData?.args?.value;

      return {
        type: 'convert',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          sourceToken: transactionGroup.sourceToken,
          destinationToken: getContractToken({
            amount: amount?.toString(),
            transaction: initialTransaction,
            direction: 'in',
            contractAddress: initialTransaction.txParams.to,
          }),
        },
      };
    }

    case TransactionType.bridgeApproval:
    case TransactionType.shieldSubscriptionApprove:
    case TransactionType.swapApproval:
    case TransactionType.tokenMethodApprove:
    case TransactionType.tokenMethodSetApprovalForAll:
      return {
        type: 'approveSpendingCap',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          token: getContractToken({
            amount: getTokenApprovalAmountFromData(
              initialTransaction.txParams.data,
              environment,
            ),
            transaction: initialTransaction,
            direction: 'out',
            contractAddress: initialTransaction.txParams.to,
          }),
        },
      };

    case TransactionType.tokenMethodIncreaseAllowance:
      return {
        type: 'increaseSpendingCap',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          token: getContractToken({
            amount: getTokenApprovalAmountFromData(
              initialTransaction.txParams.data,
              environment,
            ),
            transaction: initialTransaction,
            direction: 'out',
            contractAddress: initialTransaction.txParams.to,
          }),
        },
      };

    case TransactionType.lendingDeposit:
      return {
        type: 'lendingDeposit',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          sourceToken: getContractToken({
            transaction: initialTransaction,
            direction: 'out',
            contractAddress: initialTransaction.txParams.to,
          }),
        },
      };

    case TransactionType.stakingDeposit:
      return {
        type: 'deposit',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          token: getContractToken({
            transaction: initialTransaction,
            direction: 'out',
            contractAddress: initialTransaction.txParams.to,
          }),
        },
      };

    case TransactionType.musdClaim: {
      const claimAmountRaw = getClaimPayoutFromReceipt(
        primaryTransaction.txReceipt?.logs,
        from,
      );

      return {
        type: 'claimMusdBonus',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          ...(claimAmountRaw
            ? {
                token: {
                  amount: claimAmountRaw,
                  assetId:
                    MUSD_TOKEN_ASSET_ID_BY_CHAIN[
                      initialTransaction.chainId as Hex
                    ] ?? environment.toAssetId(MUSD_TOKEN_ADDRESS, chainId),
                  decimals: MUSD_DECIMALS,
                  direction: 'in',
                  symbol: MUSD_TOKEN.symbol,
                },
              }
            : {}),
        },
      };
    }

    default: {
      const isSupplyContractInteraction =
        initialTransaction.type === TransactionType.contractInteraction &&
        methodId &&
        supplyMethodIds.has(methodId.toLowerCase());
      const isWithdrawContractInteraction =
        initialTransaction.type === TransactionType.contractInteraction &&
        methodId &&
        withdrawMethodIds.has(methodId.toLowerCase());

      const suppliedTokenBalanceChange =
        isSupplyContractInteraction &&
        initialTransaction.simulationData?.tokenBalanceChanges?.find(
          ({ isDecrease, standard }) => isDecrease && standard === 'erc20',
        );

      if (suppliedTokenBalanceChange) {
        return {
          type: 'lendingDeposit',
          chainId,
          status,
          timestamp,
          hash,
          raw: { type: 'localTransaction', data: transactionGroup },
          data: {
            sourceToken: getContractToken({
              amount: BigInt(suppliedTokenBalanceChange.difference).toString(),
              transaction: initialTransaction,
              direction: 'out',
              contractAddress: suppliedTokenBalanceChange.address,
            }),
          },
        };
      }

      if (isWithdrawContractInteraction) {
        const fromAddress = from.toLowerCase();
        const receivedTokenLog = (
          initialTransaction.txReceipt?.logs ?? []
        ).find(({ topics: [eventTopic, , logTo] = [] }) => {
          const toAddress = logTo
            ? `0x${logTo.slice(-40)}`.toLowerCase()
            : undefined;

          return (
            eventTopic?.toLowerCase() ===
              environment.tokenTransferLogTopicHash && toAddress === fromAddress
          );
        });
        const destinationToken = receivedTokenLog
          ? getContractToken({
              amount: BigInt(String(receivedTokenLog.data)).toString(),
              transaction: initialTransaction,
              direction: 'in',
              contractAddress: receivedTokenLog.address,
            })
          : undefined;

        return {
          type: 'lendingWithdrawal',
          chainId,
          status,
          timestamp,
          hash,
          raw: { type: 'localTransaction', data: transactionGroup },
          data: {
            destinationToken,
          },
        };
      }

      // wrap and unwrap
      if (
        initialTransaction.type === TransactionType.contractInteraction &&
        methodId
      ) {
        const wrappedTokenAddress =
          environment.wrappedTokenAddresses[initialTransaction.chainId];

        if (
          wrappedTokenAddress &&
          environment.equalsIgnoreCase(to, wrappedTokenAddress)
        ) {
          const normalizedMethodId = methodId.toLowerCase();
          const activityRaw = {
            type: 'localTransaction' as const,
            data: transactionGroup,
          };

          if (wrapMethodIds.has(normalizedMethodId)) {
            const { value: wrapAmount } = initialTransaction.txParams;

            try {
              if (wrapAmount && BigInt(wrapAmount) > 0n) {
                return {
                  type: 'wrap',
                  chainId,
                  status,
                  timestamp,
                  hash,
                  raw: activityRaw,
                  data: {
                    sourceToken: getNativeToken(initialTransaction, 'out'),
                    destinationToken: getContractToken({
                      amount: wrapAmount,
                      transaction: initialTransaction,
                      direction: 'in',
                      contractAddress: wrappedTokenAddress,
                    }),
                  },
                };
              }
            } catch {
              // Invalid native value — fall through.
            }
          }

          if (unwrapMethodIds.has(normalizedMethodId)) {
            const { data } = initialTransaction.txParams;
            let unwrapAmount: string | undefined;

            if (data && data.length >= 74) {
              try {
                unwrapAmount = BigInt(`0x${data.slice(10, 74)}`).toString();
              } catch {
                unwrapAmount = undefined;
              }
            }

            const nativeToken = getNativeToken(initialTransaction, 'in');

            return {
              type: 'unwrap',
              chainId,
              status,
              timestamp,
              hash,
              raw: activityRaw,
              data: {
                sourceToken: getContractToken({
                  amount: unwrapAmount,
                  transaction: initialTransaction,
                  direction: 'out',
                  contractAddress: wrappedTokenAddress,
                }),
                destinationToken:
                  nativeToken && unwrapAmount
                    ? { ...nativeToken, amount: unwrapAmount }
                    : nativeToken,
              },
            };
          }
        }
      }

      const token = (() => {
        const { value } = initialTransaction.txParams;

        if (value === undefined || value === '') {
          return undefined;
        }

        try {
          return BigInt(value) > 0n
            ? getNativeToken(initialTransaction, 'out')
            : undefined;
        } catch {
          return undefined;
        }
      })();

      return {
        type: 'contractInteraction',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          from,
          to,
          ...(token ? { token } : {}),
          methodId,
          transactionType: initialTransaction.type,
        },
      };
    }
  }
}
