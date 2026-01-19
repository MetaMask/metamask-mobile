import {
  CaipChainId,
  Transaction,
  TransactionType,
} from '@metamask/keyring-api';
import I18n, { strings } from '../../../../locales/i18n';
import { formatWithThreshold } from '../../../util/assets';
import { MULTICHAIN_NETWORK_DECIMAL_PLACES } from '@metamask/multichain-network-controller';
import { isTransactionIncomplete } from '../../../util/transactions';

interface Asset {
  unit: string;
  type: `${string}:${string}/${string}:${string}`;
  amount: string;
  fungible: true;
}

interface Movement {
  asset: Asset;
  address?: string;
}

interface AggregatedMovement {
  address?: string;
  unit: string;
  amount: number;
}

export interface AggregatedMovementDisplayData {
  address?: string;
  unit: string;
  amount: string;
}

export interface MultichainTransactionDisplayData {
  title?: string;
  from?: AggregatedMovementDisplayData;
  to?: AggregatedMovementDisplayData;
  baseFee?: AggregatedMovementDisplayData;
  priorityFee?: AggregatedMovementDisplayData;
  isRedeposit: boolean;
}

export function useMultichainTransactionDisplay(
  transaction: Transaction,
  chainId: CaipChainId,
): MultichainTransactionDisplayData {
  const locale = I18n.locale;
  const decimalPlaces = MULTICHAIN_NETWORK_DECIMAL_PLACES[chainId];
  const isRedeposit =
    transaction.to.length === 0 && transaction.type === TransactionType.Send;

  const from = aggregateAmount(
    transaction.from as Movement[],
    true,
    locale,
    decimalPlaces,
  );
  const to = aggregateAmount(
    transaction.to as Movement[],
    transaction.type === TransactionType.Send,
    locale,
    decimalPlaces,
  );
  const baseFee = aggregateAmount(
    (transaction.fees || []).filter((fee) => fee.type === 'base') as Movement[],
    true,
    locale,
  );
  const priorityFee = aggregateAmount(
    (transaction.fees || []).filter(
      (fee) => fee.type === 'priority',
    ) as Movement[],
    true,
    locale,
  );

  const isIncomplete = isTransactionIncomplete(transaction.status);

  const typeToTitle: Partial<Record<TransactionType, string>> = {
    [TransactionType.Send]: isIncomplete
      ? `${strings('transactions.send')} ${from?.unit || ''}`
      : `${strings('transactions.sent')} ${from?.unit || ''}`,
    [TransactionType.Receive]: `${strings('transactions.received')} ${to?.unit || ''}`,
    [TransactionType.Swap]: `${strings('transactions.swap')} ${
      from?.unit
    } ${strings('transactions.to').toLowerCase()} ${to?.unit}`,
    [TransactionType.StakeDeposit]: strings(
      'transactions.tx_review_staking_deposit',
    ),
    [TransactionType.StakeWithdraw]: strings(
      'transactions.tx_review_staking_unstake',
    ),
    [TransactionType.Unknown]: strings('transactions.interaction'),
  };

  return {
    title: isRedeposit
      ? strings('transactions.redeposit')
      : typeToTitle[transaction.type],
    from,
    to,
    baseFee,
    priorityFee,
    isRedeposit,
  };
}

function aggregateAmount(
  movement: Movement[],
  isNegative: boolean,
  locale: string,
  decimals?: number,
) {
  const amountByAsset: Record<string, AggregatedMovement> = {};

  for (const mv of movement) {
    if (!mv?.asset.fungible) {
      continue;
    }
    const assetId = mv.asset.type;
    if (!amountByAsset[assetId]) {
      amountByAsset[assetId] = {
        amount: parseFloat(mv.asset.amount),
        address: mv.address,
        unit: mv.asset.unit,
      };
      continue;
    }

    amountByAsset[assetId].amount += parseFloat(mv.asset.amount);
  }

  // We make an assumption that there is only one asset in the transaction.
  return Object.entries(amountByAsset).map(([_, mv]) =>
    parseAsset(mv, locale, isNegative, decimals),
  )[0];
}

export const getMultichainTxFees = (transaction: Transaction) => {
  const baseFee = transaction?.fees?.find((fee) => fee.type === 'base') ?? null;
  const priorityFee =
    transaction?.fees?.find((fee) => fee.type === 'priority') ?? null;

  return { baseFee, priorityFee };
};

function parseAsset(
  movement: AggregatedMovement,
  locale: string,
  isNegative: boolean,
  decimals?: number,
): AggregatedMovementDisplayData {
  const threshold = 1 / 10 ** (decimals || 8); // Smallest unit to display given the decimals.
  const displayAmount = formatWithThreshold(
    movement.amount,
    threshold,
    locale,
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals || 8,
    },
  );

  let finalAmount = displayAmount;
  if (isNegative) {
    finalAmount = `-${displayAmount}`;
  }

  return {
    ...movement,
    amount: finalAmount,
  };
}
