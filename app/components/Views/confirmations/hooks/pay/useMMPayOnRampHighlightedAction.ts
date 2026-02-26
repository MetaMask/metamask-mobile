import { useMemo } from 'react';
import { noop } from 'lodash';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { PaymentMethod } from '@metamask/ramps-controller';

import { hasTransactionType } from '../../utils/transaction';
import { HighlightedItem } from '../../types/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { useMMPayOnRampStatus } from './useMMPayOnRampStatus';
import { useMMPayOnRampPaymentMethods } from './useMMPayOnRampPaymentMethods';
import { formatDelayFromArray } from '../../../../UI/Ramp/Aggregator/utils';

export function useMMPayOnRampHighlightedAction(): HighlightedItem[] {
  const transactionMeta = useTransactionMetadataRequest();
  const { inProgress } = useMMPayOnRampStatus();

  const config = useMemo(
    () => getMMPayOnRampConfig(transactionMeta),
    [transactionMeta],
  );
  const { paymentMethods } = useMMPayOnRampPaymentMethods({
    assetId: config?.assetId,
  });

  return useMemo(() => {
    if (!config || paymentMethods.length === 0) {
      return [];
    }

    return paymentMethods.map((paymentMethod) => ({
      position: 'outside_of_asset_list',
      icon: {
        type: 'payment',
        icon: paymentMethod.paymentType,
      },
      name: paymentMethod.name,
      name_description: deriveDelayDescription(paymentMethod),
      action: noop,
      fiat: '',
      fiat_description: '',
      isLoading: inProgress,
    }));
  }, [config, inProgress, paymentMethods]);
}

interface MMPayOnRampConfig {
  assetId: string;
  token: string;
  network: string;
}

const POLYGON_POL_CAIP_ASSET_ID = 'eip155:137/slip44:966';
const ARBITRUM_ETH_CAIP_ASSET_ID = 'eip155:42161/slip44:60';

const MMPAY_ON_RAMP_CONFIG_BY_TX_TYPE: Partial<
  Record<TransactionType, MMPayOnRampConfig>
> = {
  [TransactionType.predictDeposit]: {
    assetId: POLYGON_POL_CAIP_ASSET_ID,
    token: 'POL',
    network: 'Polygon',
  },
  [TransactionType.perpsDeposit]: {
    assetId: ARBITRUM_ETH_CAIP_ASSET_ID,
    token: 'ETH',
    network: 'Arbitrum',
  },
  [TransactionType.perpsDepositAndOrder]: {
    assetId: ARBITRUM_ETH_CAIP_ASSET_ID,
    token: 'ETH',
    network: 'Arbitrum',
  },
};

function getMMPayOnRampConfig(
  transactionMeta?: TransactionMeta,
): MMPayOnRampConfig | undefined {
  if (!transactionMeta) {
    return undefined;
  }

  const transactionType =
    deriveMMPayTransactionTypeFromTransactionMeta(transactionMeta);

  if (!transactionType) {
    return undefined;
  }

  return MMPAY_ON_RAMP_CONFIG_BY_TX_TYPE?.[transactionType];
}

function deriveMMPayTransactionTypeFromTransactionMeta(
  transactionMeta?: TransactionMeta,
): TransactionType | undefined {
  if (!transactionMeta) {
    return undefined;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return TransactionType.predictDeposit;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit])) {
    return TransactionType.perpsDeposit;
  }

  if (
    hasTransactionType(transactionMeta, [TransactionType.perpsDepositAndOrder])
  ) {
    return TransactionType.perpsDepositAndOrder;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.musdConversion])) {
    return TransactionType.musdConversion;
  }

  return undefined;
}

function deriveDelayDescription(paymentMethod: PaymentMethod): string {
  if (!Array.isArray(paymentMethod.delay) || paymentMethod.delay.length < 2) {
    return paymentMethod.pendingOrderDescription ?? '';
  }

  return formatDelayFromArray(paymentMethod.delay);
}
