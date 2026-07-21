import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  FontWeight,
  ListItem,
  ListItemVariant,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  getPerpsDisplaySymbol,
  PERPS_EVENT_VALUE,
  PERPS_EVENT_PROPERTY,
  type Order,
  type PerpsMarketData,
  type Position,
} from '@metamask/perps-controller';
import {
  formatPerpsFiat,
  formatPositionSize,
  formatPnl,
  formatPercentage,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import {
  formatOrderLabel,
  resolveOrderDisplayPriceAndLabel,
} from '../../utils/orderUtils';
import { usePerpsMarkets } from '../../hooks/usePerpsMarkets';
import PerpsTokenLogo from '../PerpsTokenLogo';
import type { PerpsCardProps } from './PerpsCard.types';
import { HOME_SCREEN_CONFIG } from '../../constants/perpsConfig';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';

interface PositionListDisplay {
  title: string;
  description: string;
  valueText: string;
  subvalueText: string;
  subvalueColor: TextColor;
}

interface OrderListDisplay {
  title: string;
  description: string;
  valueText: string;
  subvalueText: string;
  subvalueColor: TextColor;
}

const getPositionListDisplay = (position: Position): PositionListDisplay => {
  const isLong = parseFloat(position.size) > 0;
  const displaySymbol = getPerpsDisplaySymbol(position.symbol);
  const absoluteSize = Math.abs(parseFloat(position.size));
  const directionLower = isLong
    ? strings('perps.market.long_lowercase')
    : strings('perps.market.short_lowercase');

  const pnlValue = parseFloat(position.unrealizedPnl);
  const roeValue = parseFloat(position.returnOnEquity) * 100;

  return {
    // Match main: leverage lives in the title string (e.g. "ETH 3x long")
    title: `${displaySymbol} ${position.leverage.value}x ${directionLower}`,
    description: `${formatPositionSize(absoluteSize.toString())} ${displaySymbol}`,
    valueText: formatPerpsFiat(position.positionValue, {
      ranges: PRICE_RANGES_MINIMAL_VIEW,
    }),
    subvalueText: `${formatPnl(pnlValue)} (${formatPercentage(roeValue, 1)})`,
    subvalueColor:
      pnlValue >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault,
  };
};

const getOrderListDisplay = (order: Order): OrderListDisplay => {
  const displaySymbol = getPerpsDisplaySymbol(order.symbol);
  const { priceValue, labelKey } = resolveOrderDisplayPriceAndLabel(order);

  return {
    title: formatOrderLabel(order),
    description: `${formatPositionSize(order.originalSize)} ${displaySymbol}`,
    valueText:
      priceValue !== null
        ? formatPerpsFiat(priceValue, {
            ranges: PRICE_RANGES_UNIVERSAL,
          })
        : strings('perps.order.market'),
    subvalueText: strings(labelKey),
    subvalueColor: TextColor.TextAlternative,
  };
};

interface PerpsCardContentProps extends PerpsCardProps {
  /** Market used for default navigation when `onPress` is not provided */
  market?: PerpsMarketData;
}

/**
 * Shared list row UI. Does not call stream hooks — safe outside PerpsStreamProvider
 * when a custom `onPress` is supplied.
 */
const PerpsCardContent: React.FC<PerpsCardContentProps> = ({
  position,
  order,
  onPress,
  testID,
  source,
  source_section,
  iconSize = HOME_SCREEN_CONFIG.DefaultIconSize,
  market,
}) => {
  const navigation = useNavigation();
  const { track } = usePerpsEventTracking();
  const privacyMode = useSelector(selectPrivacyMode);

  const symbol = position?.symbol || order?.symbol || '';

  const positionDisplay = position ? getPositionListDisplay(position) : null;
  const orderDisplay = order ? getOrderListDisplay(order) : null;

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
    } else if (market) {
      if (position) {
        const buttonLocation =
          source === PERPS_EVENT_VALUE.SOURCE.POSITION_TAB
            ? PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_TAB
            : PERPS_EVENT_VALUE.BUTTON_LOCATION.PERPS_HOME;

        track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
          [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
            PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
          [PERPS_EVENT_PROPERTY.BUTTON_CLICKED]:
            PERPS_EVENT_VALUE.BUTTON_CLICKED.OPEN_POSITION,
          [PERPS_EVENT_PROPERTY.BUTTON_LOCATION]: buttonLocation,
        });
      }

      let initialTab: 'position' | 'orders' | undefined;
      if (order) {
        initialTab = 'orders';
      } else if (position) {
        initialTab = 'position';
      }
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market,
          initialTab,
          source,
          ...(source_section && { source_section }),
        },
      });
    }
  }, [
    onPress,
    market,
    navigation,
    order,
    position,
    source,
    source_section,
    track,
  ]);

  if (!position && !order) {
    return null;
  }

  const title = positionDisplay?.title ?? orderDisplay?.title ?? '';
  const descriptionNode = (
    <SensitiveText
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      isHidden={Boolean(privacyMode && position)}
      length={SensitiveTextLength.Short}
    >
      {positionDisplay?.description ?? orderDisplay?.description ?? ''}
    </SensitiveText>
  );
  const valueNode = (
    <SensitiveText
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextDefault}
      isHidden={privacyMode}
      length={SensitiveTextLength.Short}
    >
      {positionDisplay?.valueText ?? orderDisplay?.valueText ?? ''}
    </SensitiveText>
  );
  const subvalueColor =
    privacyMode && position
      ? TextColor.TextDefault
      : (positionDisplay?.subvalueColor ??
        orderDisplay?.subvalueColor ??
        TextColor.TextDefault);
  const subvalueNode = position ? (
    <SensitiveText
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={subvalueColor}
      isHidden={privacyMode}
      length={SensitiveTextLength.Short}
    >
      {positionDisplay?.subvalueText ?? ''}
    </SensitiveText>
  ) : (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={subvalueColor}
    >
      {orderDisplay?.subvalueText ?? ''}
    </Text>
  );

  return (
    <ListItem
      isInteractive
      variant={ListItemVariant.TwoLines}
      avatar={
        symbol ? <PerpsTokenLogo symbol={symbol} size={iconSize} /> : undefined
      }
      title={title}
      description={descriptionNode}
      value={valueNode}
      subvalue={subvalueNode}
      onPress={handlePress}
      testID={testID}
    />
  );
};

/**
 * Resolves market via stream for default navigation. Requires PerpsStreamProvider.
 */
const PerpsCardWithMarketLookup: React.FC<PerpsCardProps> = (props) => {
  const symbol = props.position?.symbol || props.order?.symbol || '';
  const { markets } = usePerpsMarkets();
  const market = useMemo(
    () => markets.find((m) => m.symbol === symbol),
    [markets, symbol],
  );

  return <PerpsCardContent {...props} market={market} />;
};

/**
 * PerpsCard Component
 *
 * A unified list row for positions and orders on the Perps home tab.
 * Uses MMDS ListItem defaults (including horizontal padding).
 *
 * When `onPress` is provided, stream/market lookup is skipped so the card can
 * render outside PerpsStreamProvider (e.g. Asset overview).
 */
const PerpsCard: React.FC<PerpsCardProps> = (props) => {
  if (props.onPress) {
    return <PerpsCardContent {...props} />;
  }

  return <PerpsCardWithMarketLookup {...props} />;
};

export default React.memo(PerpsCard);
