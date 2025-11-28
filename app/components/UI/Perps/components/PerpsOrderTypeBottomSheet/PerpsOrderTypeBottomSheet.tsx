import React, { useRef, useEffect, memo } from 'react';
import { View, TouchableOpacity } from 'react-native';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { useTheme } from '../../../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { createStyles } from './PerpsOrderTypeBottomSheet.styles';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import type { OrderType } from '../../controllers/types';

interface PerpsOrderTypeBottomSheetProps {
  isVisible?: boolean;
  onClose: () => void;
  onSelect: (orderType: OrderType) => void;
  currentOrderType?: OrderType;
  asset?: string;
  direction?: 'long' | 'short';
  sheetRef?: React.RefObject<BottomSheetRef>;
}

const PerpsOrderTypeBottomSheet: React.FC<PerpsOrderTypeBottomSheetProps> = ({
  isVisible = true,
  onClose,
  onSelect,
  currentOrderType,
  asset = 'BTC',
  direction = 'long',
  sheetRef: externalSheetRef,
}) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const internalSheetRef = useRef<BottomSheetRef>(null);
  const sheetRef = externalSheetRef || internalSheetRef;
  const { track } = usePerpsEventTracking();

  useEffect(() => {
    if (isVisible && !externalSheetRef) {
      sheetRef.current?.onOpenBottomSheet();
    }
  }, [isVisible, externalSheetRef, sheetRef]);

  const orderTypes = [
    {
      type: 'market' as OrderType,
      title: strings('perps.order.type.market.title'),
      description: strings('perps.order.type.market.description'),
    },
    {
      type: 'limit' as OrderType,
      title: strings('perps.order.type.limit.title'),
      description: strings('perps.order.type.limit.description'),
    },
  ];

  const handleSelect = (type: OrderType) => {
    // Track order type selected only if it's different from current
    if (type !== currentOrderType) {
      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.ORDER_TYPE_SELECTED,
        [PerpsEventProperties.ASSET]: asset,
        [PerpsEventProperties.DIRECTION]:
          direction === 'long'
            ? PerpsEventValues.DIRECTION.LONG
            : PerpsEventValues.DIRECTION.SHORT,
        [PerpsEventProperties.ORDER_TYPE]:
          type === 'market'
            ? PerpsEventValues.ORDER_TYPE.MARKET
            : PerpsEventValues.ORDER_TYPE.LIMIT,
      });
    }

    onSelect(type);
    onClose();
  };

  if (!isVisible) return null;

  return (
    <BottomSheet
      ref={sheetRef}
      shouldNavigateBack={!externalSheetRef}
      onClose={externalSheetRef ? undefined : onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingMD}>
          {strings('perps.order.type.title')}
        </Text>
      </BottomSheetHeader>

      <View style={styles.container}>
        {orderTypes.map(({ type, title, description }) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.option,
              currentOrderType === type && styles.optionSelected,
            ]}
            onPress={() => handleSelect(type)}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionContent}>
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={TextColor.Default}
                  style={styles.optionTitle}
                >
                  {title}
                </Text>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Alternative}
                >
                  {description}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheet>
  );
};

PerpsOrderTypeBottomSheet.displayName = 'PerpsOrderTypeBottomSheet';

export default memo(
  PerpsOrderTypeBottomSheet,
  (prevProps, nextProps) =>
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.currentOrderType === nextProps.currentOrderType,
);
