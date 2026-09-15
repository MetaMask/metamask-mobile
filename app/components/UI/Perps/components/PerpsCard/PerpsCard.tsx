import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';

import {
  FontWeight,
  ListItem,
  ListItemVariant,
  SensitiveText,
  SensitiveTextLength,
  Tag,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  getPerpsDisplaySymbol,
  PERPS_CONSTANTS,
  PERPS_EVENT_VALUE,
  PERPS_EVENT_PROPERTY,
  type Order,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import {
  formatPerpsFiat,
  formatPositionSize,
  PRICE_RANGES_UNIVERSAL,
} from '../../utils/formatUtils';
import { getPerpsPositionHeaderDisplay } from '../../utils/positionDisplay';
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

interface OrderListDisplay {
  title: string;
  description: string;
  valueText: string;
  subvalueText: string;
  subvalueColor: TextColor;
}

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
        : labelKey === 'perps.order.market_price'
          ? strings('perps.order.market')
          : PERPS_CONSTANTS.FallbackPriceDisplay,
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
  const navigation = useNavigation<AppNavigationProp>();
  const { track } = usePerpsEventTracking();
  const privacyMode = useSelector(selectPrivacyMode);

  const symbol = position?.symbol || order?.symbol || '';

  const positionDisplay = position
    ? getPerpsPositionHeaderDisplay(position)
    : null;
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

  const title = positionDisplay?.displaySymbol ?? orderDisplay?.title ?? '';
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
      color={
        privacyMode && position
          ? TextColor.TextDefault
          : (positionDisplay?.pnlColor ?? TextColor.TextDefault)
      }
      isHidden={privacyMode}
      length={SensitiveTextLength.Short}
    >
      {positionDisplay?.pnlText ?? orderDisplay?.valueText ?? ''}
    </SensitiveText>
  );
  const subvalueColor =
    privacyMode && position
      ? TextColor.TextDefault
      : (positionDisplay?.pnlColor ??
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
      {positionDisplay?.roeText ?? ''}
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

  // TAT-3776's Figma position row uses 8px vertical padding. Reset the
  // ListItem minimum so its 40px avatar determines the row height.
  const rowClassName = position ? 'min-h-0 py-2' : undefined;

  return (
    <ListItem
      isInteractive
      variant={ListItemVariant.TwoLines}
      twClassName={rowClassName}
      avatar={
        symbol ? <PerpsTokenLogo symbol={symbol} size={iconSize} /> : undefined
      }
      title={title}
      titleEndAccessory={
        positionDisplay ? (
          <Tag
            severity={positionDisplay.directionSeverity}
            testID={testID ? `${testID}-direction-tag` : undefined}
          >
            {positionDisplay.directionLabel}
          </Tag>
        ) : undefined
      }
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
 * Uses MMDS ListItem defaults, with compact position spacing from TAT-3776.
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
