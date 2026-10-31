import React from 'react';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import { getHumanReadableTokenAmount } from '../../../../../../../util/activity-adapters';
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsTemplateFrame,
} from '../../../../../../Views/ActivityDetails/components';
import {
  formatCurrencyValue,
  formatPositionSize,
} from '../../../../../Predict/utils/format';
import type { PredictSettlementListItem } from './PredictDetails.types';
import {
  PredictHero,
  PredictMarketContext,
  StatusAndDateRows,
} from './PredictDetailsShared';
import {
  getPredictSettlementOutcome,
  type PredictSettlementOutcome,
} from './PredictDetails.utils';
import { useOpenPredictHome } from './useOpenPredictHome';

const OUTCOME_LABEL_KEYS: Record<PredictSettlementOutcome, string> = {
  won: 'predict.transactions.settlement_result_won',
  lost: 'predict.transactions.settlement_result_lost',
  partial: 'predict.transactions.settlement_result_partial',
};

const SIDE_LABEL_KEYS = {
  yes: 'predict.market_details.yes',
  no: 'predict.market_details.no',
} as const;

/**
 * Details for a Settlement: a resolved Market paying out a held Position.
 * Renders from the item alone; the mapper carries everything it needs. A
 * Market outside the catalog has no title, so it shows neutral copy.
 */
export function PredictSettlementDetails({
  item,
}: {
  item: PredictSettlementListItem;
}) {
  const { data } = item;
  const openPredictHome = useOpenPredictHome();
  const proceedsAmount = data.token
    ? getHumanReadableTokenAmount(data.token)
    : undefined;
  const proceeds =
    proceedsAmount === undefined ? undefined : Number(proceedsAmount);
  const realizedPnl =
    data.realizedPnl === undefined ? undefined : Number(data.realizedPnl);
  const outcome = getPredictSettlementOutcome(data.side, data.result);

  return (
    <ActivityDetailsTemplateFrame
      hero={
        <PredictHero
          amount={formatCurrencyValue(proceeds, { showSign: true })}
          icon={data.icon}
          isPositive={proceeds !== undefined && proceeds > 0}
        />
      }
      metadata={
        <ActivityDetailSection>
          <PredictMarketContext
            icon={data.icon}
            outcome={data.outcomeLabel ?? strings(SIDE_LABEL_KEYS[data.side])}
            title={
              data.marketQuestion ??
              data.eventTitle ??
              strings('predict_next.portfolio.unknown_market')
            }
          />
          <StatusAndDateRows item={item} />
          <ActivityDetailRow
            label={strings('predict.transactions.settlement_result')}
            value={strings(OUTCOME_LABEL_KEYS[outcome])}
          />
          <ActivityDetailRow
            label={strings('predict.transactions.shares_settled')}
            value={formatPositionSize(data.shares)}
          />
        </ActivityDetailSection>
      }
      details={
        realizedPnl === undefined ? undefined : (
          <ActivityDetailSection>
            <ActivityDetailRow
              label={strings('predict.transactions.net_pnl')}
              value={
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={
                    realizedPnl < 0
                      ? TextColor.ErrorDefault
                      : TextColor.SuccessDefault
                  }
                >
                  {formatCurrencyValue(realizedPnl, { showSign: true })}
                </Text>
              }
            />
          </ActivityDetailSection>
        )
      }
      footer={
        <ActivityDetailsDoItAgainButton
          label={strings('predict.transactions.place_another_prediction')}
          onPress={openPredictHome}
        />
      }
    />
  );
}
