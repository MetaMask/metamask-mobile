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
  getLocalTransactionFees,
  getLocalTransactionStatus,
  getTokenApprovalAmountFromData,
  isUnlimitedApprovalAmount,
} from './helpers';
import {
  mobileActivityAdapterEnvironment,
  type ActivityAdapterEnvironment,
} from './environment';

const EVM_NATIVE_DECIMALS = 18;

const PREDICT_COLLATERAL_DECIMALS = 6;
const PREDICT_COLLATERAL_SYMBOL = 'USDC';
const ERC20_TRANSFER_SELECTOR = '0xa9059cbb';

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

  // Base network (gas) fee in the chain's native token, derived from the tx
  // receipt. Spread into `data` for types that surface fees in the UI.
  const fees = getLocalTransactionFees(
    transactionGroup,
    nativeAsset,
    nativeSymbol,
  );

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

  const getNativeTokenWithAmount = (
    direction: TokenAmount['direction'],
    amount?: string,
  ) => {
    if (nativeSymbol === undefined) {
      return undefined;
    }
    return {
      direction,
      symbol: nativeSymbol,
      ...(amount ? { amount } : {}),
      ...(nativeAsset?.assetId ? { assetId: nativeAsset.assetId } : {}),
      decimals: nativeAsset?.decimals ?? EVM_NATIVE_DECIMALS,
    };
  };

  const getUnstakeAmount = (): string | undefined => {
    const data = initialTransaction.txParams.data;
    if (!data || data.length < 74) {
      return undefined;
    }
    try {
      const shares = BigInt(`0x${data.slice(10, 74)}`);
      return shares > 0n ? `0x${shares.toString(16)}` : undefined;
    } catch {
      return undefined;
    }
  };

  const getClaimAmount = (): string | undefined => {
    const change = initialTransaction.simulationData?.nativeBalanceChange;
    if (!change || change.isDecrease) {
      return undefined;
    }
    return change.difference;
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

  const getApprovalToken = () => {
    const approvalAmount = getTokenApprovalAmountFromData(
      initialTransaction.txParams.data,
      environment,
    );
    const token = getContractToken({
      amount: approvalAmount,
      transaction: initialTransaction,
      direction: 'out',
      contractAddress: initialTransaction.txParams.to,
    });

    if (!token || !approvalAmount) {
      return token;
    }

    return {
      ...token,
      ...(isUnlimitedApprovalAmount(approvalAmount, token.decimals)
        ? { isUnlimitedApproval: true }
        : {}),
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

  const getLendingWithdrawalDestinationToken = () => {
    const fromAddress = from.toLowerCase();
    const receivedTokenLog = (initialTransaction.txReceipt?.logs ?? []).find(
      ({ topics: [eventTopic, , logTo] = [] }) => {
        const toAddress = logTo
          ? `0x${logTo.slice(-40)}`.toLowerCase()
          : undefined;

        return (
          eventTopic?.toLowerCase() === environment.tokenTransferLogTopicHash &&
          toAddress === fromAddress
        );
      },
    );

    return receivedTokenLog
      ? getContractToken({
          amount: BigInt(String(receivedTokenLog.data)).toString(),
          transaction: initialTransaction,
          direction: 'in',
          contractAddress: receivedTokenLog.address,
        })
      : undefined;
  };

  const getLendingDepositSourceToken = () => {
    const suppliedTokenBalanceChange =
      initialTransaction.simulationData?.tokenBalanceChanges?.find(
        ({ isDecrease, standard }) => isDecrease && standard === 'erc20',
      );

    if (suppliedTokenBalanceChange) {
      return getContractToken({
        amount: BigInt(suppliedTokenBalanceChange.difference).toString(),
        transaction: initialTransaction,
        direction: 'out',
        contractAddress: suppliedTokenBalanceChange.address,
      });
    }

    const fromAddress = from.toLowerCase();
    const poolAddress = to.toLowerCase();
    const logs = initialTransaction.txReceipt?.logs ?? [];
    const isUserOutgoingTransfer = (
      eventTopic: string | undefined,
      logFrom: string | undefined,
    ): boolean => {
      const senderAddress = logFrom
        ? `0x${logFrom.slice(-40)}`.toLowerCase()
        : undefined;
      return (
        eventTopic?.toLowerCase() === environment.tokenTransferLogTopicHash &&
        senderAddress === fromAddress
      );
    };
    const sentTokenLog =
      logs.find(({ topics: [eventTopic, logFrom, logTo] = [] }) => {
        const recipientAddress = logTo
          ? `0x${logTo.slice(-40)}`.toLowerCase()
          : undefined;
        return (
          isUserOutgoingTransfer(eventTopic, logFrom) &&
          recipientAddress === poolAddress
        );
      }) ??
      logs.find(({ topics: [eventTopic, logFrom] = [] }) =>
        isUserOutgoingTransfer(eventTopic, logFrom),
      );

    if (sentTokenLog) {
      return getContractToken({
        amount: BigInt(String(sentTokenLog.data)).toString(),
        transaction: initialTransaction,
        direction: 'out',
        contractAddress: sentTokenLog.address,
      });
    }

    return getContractToken({
      transaction: initialTransaction,
      direction: 'out',
      contractAddress: initialTransaction.txParams.to,
    });
  };
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
              ...(fees ? { fees } : {}),
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
          ...(fees ? { fees } : {}),
        },
      };
    }

    return undefined;
  };

  const directWrappedTokenActivity = getDirectWrappedTokenActivity();
  if (directWrappedTokenActivity) {
    return directWrappedTokenActivity;
  }

  const getPredictFundsActivity = (): ActivityListItem | undefined => {
    const nested = initialTransaction.nestedTransactions;
    if (!nested?.length) {
      return undefined;
    }

    const depositTx = nested.find(
      (n) =>
        n.type === TransactionType.predictDeposit ||
        n.type === TransactionType.predictDepositAndOrder,
    );
    const withdrawTx = nested.find(
      (n) => n.type === TransactionType.predictWithdraw,
    );
    // NOTE: TransactionType.predictClaim is intentionally NOT handled here.
    // Unlike deposits/withdrawals (which the Polymarket feed doesn't return, so
    // this local copy is their only source), claims ARE returned by the feed and
    // mapped to `predictionClaimWinnings` (with the won amount) in
    // predict-activity.ts. Labeling the on-chain claim copy here would surface a
    // SECOND claim row in the Predictions bucket, and it can't dedup against the
    // feed row (synthetic vs real hash — see the cross-source dedup note in
    // adapters/dedup.ts). So the claim's on-chain tx falls through to the
    // generic kind for now. TODO(activity-redesign): when "All" lands and
    // cross-source dedup is in place, suppress this on-chain copy in favor of
    // the feed's authoritative claim row.
    const fundsTx = depositTx ?? withdrawTx;
    if (!fundsTx) {
      return undefined;
    }

    const direction: TokenAmount['direction'] = depositTx ? 'in' : 'out';
    const contractAddress = fundsTx.to;

    // The collateral moves via ERC-20 transfer(address,uint256); the amount is
    // the second 32-byte word of the calldata.
    let amount: string | undefined;
    const data = fundsTx.data;
    if (
      data &&
      data.toLowerCase().startsWith(ERC20_TRANSFER_SELECTOR) &&
      data.length >= 138
    ) {
      try {
        amount = BigInt(`0x${data.slice(74, 138)}`).toString();
      } catch {
        amount = undefined;
      }
    }

    const tokenMetadata = contractAddress
      ? getKnownTokenMetadata(chainId, contractAddress, environment)
      : undefined;
    const assetId = contractAddress
      ? environment.toAssetId(contractAddress, chainId)
      : undefined;

    const token: TokenAmount = {
      direction,
      symbol: tokenMetadata?.symbol ?? PREDICT_COLLATERAL_SYMBOL,
      decimals: tokenMetadata?.decimals ?? PREDICT_COLLATERAL_DECIMALS,
      ...(assetId ? { assetId } : {}),
      ...(amount ? { amount } : {}),
    };

    return {
      type: depositTx ? 'predictionsAddFunds' : 'predictionsWithdrawFunds',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'localTransaction', data: transactionGroup },
      data: { token },
    };
  };

  const predictFundsActivity = getPredictFundsActivity();
  if (predictFundsActivity) {
    return predictFundsActivity;
  }

  const getSmartAccountUpgradeActivity = (): ActivityListItem | undefined => {
    // EIP-7702: a transaction carrying an authorization list is the one that
    // delegates (upgrades) the EOA to a smart account. This is the canonical
    // `isUpgrade` signal used elsewhere (see transaction-controller batch
    // metrics). Checked after the more specific early-returns above so a batch
    // that also performs a recognised action (e.g. a Predict deposit) keeps its
    // action label.
    if (!initialTransaction.txParams.authorizationList?.length) {
      return undefined;
    }
    // No asset moves in an upgrade — the only ETH movement is gas, so the row
    // shows the gas paid as a native-asset amount (rendered like any other tx).
    const gasAmount = fees?.find((fee) => fee.type === 'base')?.amount;
    return {
      type: 'smartAccountUpgrade',
      chainId,
      status,
      timestamp,
      hash,
      raw: { type: 'localTransaction', data: transactionGroup },
      data: {
        from,
        to,
        token: getNativeTokenWithAmount('out', gasAmount),
        ...(fees ? { fees } : {}),
      },
    };
  };

  const smartAccountUpgradeActivity = getSmartAccountUpgradeActivity();
  if (smartAccountUpgradeActivity) {
    return smartAccountUpgradeActivity;
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
          ...(fees ? { fees } : {}),
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
          ...(fees ? { fees } : {}),
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
          ...(fees ? { fees } : {}),
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
          ...(fees ? { fees } : {}),
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
          ...(fees ? { fees } : {}),
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
          ...(fees ? { fees } : {}),
        },
      };
    }

    case TransactionType.bridgeApproval:
    case TransactionType.shieldSubscriptionApprove:
    case TransactionType.swapApproval:
    case TransactionType.tokenMethodApprove:
    case TransactionType.tokenMethodSetApprovalForAll: {
      return {
        type: 'approveSpendingCap',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          token: getApprovalToken(),
          ...(fees ? { fees } : {}),
        },
      };
    }

    case TransactionType.tokenMethodIncreaseAllowance: {
      return {
        type: 'increaseSpendingCap',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          token: getApprovalToken(),
          ...(fees ? { fees } : {}),
        },
      };
    }

    case TransactionType.lendingDeposit:
      return {
        type: 'lendingDeposit',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          sourceToken: getLendingDepositSourceToken(),
          ...(fees ? { fees } : {}),
        },
      };

    case TransactionType.lendingWithdraw:
      return {
        type: 'lendingWithdrawal',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          destinationToken: getLendingWithdrawalDestinationToken(),
          ...(fees ? { fees } : {}),
        },
      };

    case TransactionType.stakingDeposit:
      return {
        type: 'stake',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          token: getNativeTokenWithAmount(
            'out',
            initialTransaction.txParams.value,
          ),
          ...(fees ? { fees } : {}),
        },
      };

    case TransactionType.stakingClaim:
      return {
        type: 'claim',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          token: getNativeTokenWithAmount('in', getClaimAmount()),
          ...(fees ? { fees } : {}),
        },
      };

    case TransactionType.stakingUnstake:
      return {
        type: 'unstake',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          token: getNativeTokenWithAmount('in', getUnstakeAmount()),
          ...(fees ? { fees } : {}),
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
          ...(fees ? { fees } : {}),
        },
      };
    }

    case TransactionType.deployContract: {
      return {
        type: 'contractDeployment',
        chainId,
        status,
        timestamp,
        hash,
        raw: { type: 'localTransaction', data: transactionGroup },
        data: {
          from,
          to,
          ...(fees ? { fees } : {}),
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
            ...(fees ? { fees } : {}),
          },
        };
      }

      if (isWithdrawContractInteraction) {
        return {
          type: 'lendingWithdrawal',
          chainId,
          status,
          timestamp,
          hash,
          raw: { type: 'localTransaction', data: transactionGroup },
          data: {
            destinationToken: getLendingWithdrawalDestinationToken(),
            ...(fees ? { fees } : {}),
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
                    ...(fees ? { fees } : {}),
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
                ...(fees ? { fees } : {}),
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
          ...(fees ? { fees } : {}),
        },
      };
    }
  }
}
