import { useCallback, useMemo } from 'react';
import { IconName } from '@metamask/design-system-react-native';
import {
  CHAIN_IDS,
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import { strings } from '../../../../../../locales/i18n';
import { useRampNavigation } from '../../../../UI/Ramp/hooks/useRampNavigation';
import { MUSD_TOKEN_ASSET_ID_BY_CHAIN } from '../../../../UI/Earn/constants/musd';
import { hasTransactionType } from '../../utils/transaction';
import type { MMPayOnRampIntent } from '../../../../UI/Ramp/types';
import { HighlightedItem } from '../../types/token';
import { useTransactionMetadataRequest } from '../transactions/useTransactionMetadataRequest';
import { startMMPayOnRampSession } from './useMMPayOnRampLifecycle';
import { useMMPayOnRampStatus } from './useMMPayOnRampStatus';

export function useMMPayOnRampHighlightedAction(): HighlightedItem[] {
  const transactionMeta = useTransactionMetadataRequest();
  const { goToBuy } = useRampNavigation();
  const { inProgress } = useMMPayOnRampStatus();

  const config = useMemo(
    () => getMMPayOnRampConfig(transactionMeta),
    [transactionMeta],
  );

  const onPressBuy = useCallback(() => {
    const transactionType =
      deriveMMPayTransactionTypeFromTransactionMeta(transactionMeta);
    const mmPayTransactionId = transactionMeta?.id;

    if (!config || !transactionType || !mmPayTransactionId) {
      return;
    }

    const startedAt = Date.now();
    const session = startMMPayOnRampSession({
      assetId: config.assetId,
      mmPayTransactionId,
      startedAt,
      transactionType,
    });

    const mmPayOnRamp: MMPayOnRampIntent = {
      mmPayTransactionId: session.mmPayTransactionId,
      startedAt: session.startedAt,
      source: session.source,
      transactionType: session.transactionType,
    };

    goToBuy(
      {
        assetId: config.assetId,
      },
      { mmPayOnRamp },
    );
  }, [config, goToBuy, transactionMeta]);

  return useMemo(() => {
    if (!config) {
      return [];
    }

    return [
      {
        position: 'outside_of_asset_list',
        icon: IconName.Money,
        name: strings('pay_with_modal.top_up_title'),
        name_description: strings('pay_with_modal.top_up_description', {
          token: config.token,
          network: config.network,
        }),
        action: () => {},
        fiat: '',
        fiat_description: '',
        isLoading: inProgress,
        actions: [
          {
            buttonLabel: strings('pay_with_modal.buy'),
            onPress: onPressBuy,
            isDisabled: inProgress,
          },
        ],
      },
    ];
  }, [config, onPressBuy, inProgress]);
}

interface MMPayOnRampConfig {
  assetId: string;
  token: string;
  network: string;
}

const POLYGON_USDC_CAIP_ASSET_ID =
  'eip155:137/erc20:0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

const MMPAY_ON_RAMP_CONFIG_BY_TX_TYPE: Partial<
  Record<TransactionType, MMPayOnRampConfig>
> = {
  [TransactionType.predictDeposit]: {
    assetId: POLYGON_USDC_CAIP_ASSET_ID,
    token: 'USDC',
    network: 'Polygon',
  },
  [TransactionType.perpsDeposit]: {
    assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
    token: 'mUSD',
    network: 'Linea',
  },
  [TransactionType.perpsDepositAndOrder]: {
    assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
    token: 'mUSD',
    network: 'Linea',
  },
  [TransactionType.musdConversion]: {
    assetId: MUSD_TOKEN_ASSET_ID_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
    token: 'mUSD',
    network: 'Linea',
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
