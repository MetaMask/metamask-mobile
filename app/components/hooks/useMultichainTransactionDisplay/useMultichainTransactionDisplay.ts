import { Transaction, TransactionType } from '@metamask/keyring-api';
import I18n, { strings } from '../../../../locales/i18n';
import { formatWithThreshold } from '../../../util/assets';
import {
  MULTICHAIN_NETWORK_DECIMAL_PLACES,
  NonEvmNetworkConfiguration,
} from '@metamask/multichain-network-controller';

type Asset = {
  unit: string;
  type: `${string}:${string}/${string}:${string}`;
  amount: string;
  fungible: true;
};

type Movement = {
  asset: Asset;
  address?: string;
};

type AggregatedMovement = {
  address?: string;
  unit: string;
  amount: number;
};

export function useMultichainTransactionDisplay(
  transaction: Transaction,
  networkConfig: NonEvmNetworkConfiguration,
) {
  const locale = I18n.locale;
  const { chainId } = networkConfig;
  const decimalPlaces = MULTICHAIN_NETWORK_DECIMAL_PLACES[chainId];

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

  const typeToTitle: Partial<Record<TransactionType, string>> = {
    [TransactionType.Send]: strings('sent'),
    [TransactionType.Receive]: strings('received'),
    [TransactionType.Swap]: `${strings('swap')} ${from?.unit} ${strings(
      'to',
    ).toLowerCase()} ${to?.unit}`,
    [TransactionType.Unknown]: strings('interaction'),
  };

  return {
    ...transaction,
    title: typeToTitle[transaction.type],
    from,
    to,
    baseFee,
    priorityFee,
    isRedeposit:
      transaction.to.length === 0 && transaction.type === TransactionType.Send,
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

function parseAsset(
  movement: AggregatedMovement,
  locale: string,
  isNegative: boolean,
  decimals?: number,
) {
  // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31880
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const threshold = 1 / 10 ** (decimals || 8); // Smallest unit to display given the decimals.
  const displayAmount = formatWithThreshold(
    movement.amount,
    threshold,
    locale,
    {
      minimumFractionDigits: 0,
      // TODO: Fix in https://github.com/MetaMask/metamask-extension/issues/31880
      // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
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
