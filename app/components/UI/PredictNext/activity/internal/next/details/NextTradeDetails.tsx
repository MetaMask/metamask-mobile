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
import { useNextVenueId } from '../../../../implementation';
import { getOutcomeName } from '../../../../utils/entryCopy';
import {
  PredictMarketContext,
  StatusAndDateRows,
} from '../../legacy/details/PredictDetailsShared';
import { useOpenPredictHome } from '../../legacy/details/useOpenPredictHome';
import { useNextActivityEntry } from '../useNextActivityEntry';

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

/**
 * Details for a canonical Trade, in the Polymarket details layout. The item
 * carries the amount and presentation; the canonical entry adds the Outcome,
 * shares, price and a sell's realized PnL. A row whose entry is not loaded
 * keeps what the item has and omits the rest.
 */
export function NextTradeDetails({
  item,
}: Readonly<{ item: PredictTradeListItem }>) {
  const venueId = useNextVenueId();
  const { entry, isLoading } = useNextActivityEntry(venueId, item.hash);
  const openPredictHome = useOpenPredictHome();

  if (!entry && isLoading) {
    return null;
  }

  const trade = entry?.type === 'trade' ? entry : undefined;
  const isBuy = item.type === 'predictionPlaced';
  const tokenAmount = item.data.token
    ? getHumanReadableTokenAmount(item.data.token)
    : undefined;
  const amount =
    tokenAmount === undefined
      ? undefined
      : formatCurrencyValue(Number(tokenAmount));
  const realizedPnl =
    trade?.realizedPnl === undefined ? undefined : Number(trade.realizedPnl);

  return (
    <ActivityDetailsTemplateFrame
      metadata={
        <ActivityDetailSection>
          <PredictMarketContext
            icon={item.data.icon}
            outcome={
              trade ? getOutcomeName(trade.side, trade.context) : undefined
            }
            title={
              trade?.context?.marketQuestion ??
              item.data.eventTitle ??
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
            value={trade ? formatPositionSize(trade.shares) : undefined}
          />
          <ActivityDetailRow
            label={strings('predict.transactions.price_per_share')}
            value={trade ? formatSharePrice(trade.price) : undefined}
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
