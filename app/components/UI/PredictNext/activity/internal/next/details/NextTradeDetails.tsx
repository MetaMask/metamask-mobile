import React from 'react';
import {
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import {
  getHumanReadableTokenAmount,
  type ActivityListItem,
} from '../../../../../../../util/activity-adapters';
import {
  ActivityDetailRow,
  ActivityDetailSection,
  ActivityDetailsDoItAgainButton,
  ActivityDetailsTemplateFrame,
} from '../../../../../../Views/ActivityDetails/components';
import {
  formatCurrencyValue,
  formatPositionSize,
  formatPrice,
} from '../../../../../Predict/utils/format';
import {
  PredictMarketContext,
  StatusAndDateRows,
} from '../../legacy/details/PredictDetailsShared';
import { useOpenPredictHome } from '../../legacy/details/useOpenPredictHome';

export type PredictTradeListItem = Extract<
  ActivityListItem,
  { type: 'predictionPlaced' | 'predictionCashedOut' }
>;

/** Price per share: 4 decimals below $1, 2 from $1 up. */
function formatSharePrice(price: string): string {
  const decimals = Number(price) >= 1 ? 2 : 4;
  return formatPrice(price, {
    minimumDecimals: decimals,
    maximumDecimals: decimals,
  });
}

function NetPnlSection({ realizedPnl }: Readonly<{ realizedPnl: number }>) {
  return (
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
  );
}

const SIDE_LABEL_KEYS = {
  yes: 'predict.market_details.yes',
  no: 'predict.market_details.no',
} as const;

/**
 * Details for a canonical Trade, in the Polymarket details layout. The mapper
 * carries the amount, Outcome, shares, price, and a sell's realized PnL.
 * A legacy row that omits those fields shows only what it has.
 */
export function NextTradeDetails({
  item,
}: Readonly<{ item: PredictTradeListItem }>) {
  const { data } = item;
  const openPredictHome = useOpenPredictHome();
  const isBuy = item.type === 'predictionPlaced';
  const tokenAmount = data.token
    ? getHumanReadableTokenAmount(data.token)
    : undefined;
  const amount =
    tokenAmount === undefined
      ? undefined
      : formatCurrencyValue(Number(tokenAmount));
  const realizedPnl =
    data.realizedPnl === undefined ? undefined : Number(data.realizedPnl);
  const outcome =
    data.outcomeLabel ??
    (data.side ? strings(SIDE_LABEL_KEYS[data.side]) : undefined);

  return (
    <ActivityDetailsTemplateFrame
      metadata={
        <ActivityDetailSection>
          <PredictMarketContext
            icon={data.icon}
            outcome={outcome}
            title={
              data.marketQuestion ??
              data.eventTitle ??
              strings('predict_next.portfolio.unknown_market')
            }
          />
          <StatusAndDateRows item={item} />
          <ActivityDetailRow
            label={strings('predict.transactions.predicted_amount')}
            value={isBuy ? amount : undefined}
          />
          <ActivityDetailRow
            label={
              isBuy
                ? strings('predict.transactions.shares_bought')
                : strings('predict.transactions.shares_sold')
            }
            value={
              data.shares === undefined
                ? undefined
                : formatPositionSize(data.shares)
            }
          />
          <ActivityDetailRow
            label={strings('predict.transactions.price_per_share')}
            value={
              data.price === undefined
                ? undefined
                : formatSharePrice(data.price)
            }
          />
        </ActivityDetailSection>
      }
      details={
        isBuy || realizedPnl === undefined ? undefined : (
          <NetPnlSection realizedPnl={realizedPnl} />
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
