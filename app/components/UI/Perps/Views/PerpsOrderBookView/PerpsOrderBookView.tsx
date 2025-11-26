import React, { useCallback, useState, useRef } from 'react';
import { View, ScrollView, Pressable, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useStyles } from '../../../../../component-library/hooks';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../component-library/components/Buttons/Button';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../../locales/i18n';
import { usePerpsLiveOrderBook } from '../../hooks/stream/usePerpsLiveOrderBook';
import { usePerpsMeasurement } from '../../hooks/usePerpsMeasurement';
import { usePerpsNavigation } from '../../hooks';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  PerpsEventProperties,
  PerpsEventValues,
} from '../../constants/eventNames';
import { TraceName } from '../../../../../util/trace';
import PerpsOrderBookTable, {
  type UnitDisplay,
} from '../../components/PerpsOrderBookTable';
import PerpsOrderBookDepthChart from '../../components/PerpsOrderBookDepthChart';
import styleSheet from './PerpsOrderBookView.styles';
import type {
  PerpsOrderBookViewProps,
  OrderBookRouteParams,
} from './PerpsOrderBookView.types';
import { PerpsOrderBookViewSelectorsIDs } from '../../../../../../e2e/selectors/Perps/Perps.selectors';

// Available depth band options (nSigFigs values)
const DEPTH_BAND_OPTIONS = [
  { value: 1, label: '0.1' },
  { value: 2, label: '0.2' },
  { value: 3, label: '0.5' },
  { value: 4, label: '1' },
  { value: 5, label: '10' },
  { value: 6, label: '100' },
];

const PerpsOrderBookView: React.FC<PerpsOrderBookViewProps> = ({
  testID = PerpsOrderBookViewSelectorsIDs.CONTAINER,
}) => {
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: OrderBookRouteParams }, 'params'>>();
  const { symbol } = route.params || {};
  const { styles } = useStyles(styleSheet, {});
  const { navigateToOrder } = usePerpsNavigation();
  const { track } = usePerpsEventTracking();

  // Unit display state (base currency or USD)
  const [unitDisplay, setUnitDisplay] = useState<UnitDisplay>('usd');

  // Depth band state (nSigFigs value)
  const [depthBand, setDepthBand] = useState(5); // Default to "10"
  const [isDepthBandSheetVisible, setIsDepthBandSheetVisible] = useState(false);
  const depthBandSheetRef = useRef<BottomSheetRef>(null);

  // Subscribe to live order book data
  const { orderBook, isLoading, error } = usePerpsLiveOrderBook({
    symbol: symbol || '',
    levels: 10,
    nSigFigs: depthBand,
    throttleMs: 100,
  });

  // Performance measurement
  usePerpsMeasurement({
    traceName: TraceName.PerpsOrderBookView,
    conditions: [!!symbol, !!orderBook],
  });

  // Track screen view
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    conditions: [!!symbol, !!orderBook],
    properties: {
      [PerpsEventProperties.SCREEN_TYPE]:
        PerpsEventValues.SCREEN_TYPE.ORDER_BOOK,
      [PerpsEventProperties.ASSET]: symbol || '',
    },
  });

  // Handle back button press
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Get current depth band label for display
  const currentDepthBandLabel =
    DEPTH_BAND_OPTIONS.find((opt) => opt.value === depthBand)?.label || '10';

  // Handle depth band dropdown press
  const handleDepthBandPress = useCallback(() => {
    setIsDepthBandSheetVisible(true);
  }, []);

  // Handle depth band selection
  const handleDepthBandSelect = useCallback(
    (value: number) => {
      setDepthBand(value);
      setIsDepthBandSheetVisible(false);

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.TAP,
        [PerpsEventProperties.ASSET]: symbol || '',
      });
    },
    [symbol, track],
  );

  // Handle depth band sheet close
  const handleDepthBandSheetClose = useCallback(() => {
    setIsDepthBandSheetVisible(false);
  }, []);

  // Handle unit toggle
  const handleUnitChange = useCallback(
    (unit: UnitDisplay) => {
      setUnitDisplay(unit);

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PerpsEventProperties.INTERACTION_TYPE]:
          PerpsEventValues.INTERACTION_TYPE.TAP,
        [PerpsEventProperties.ASSET]: symbol || '',
      });
    },
    [symbol, track],
  );

  // Handle Long button press
  const handleLongPress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.TAP,
      [PerpsEventProperties.ASSET]: symbol || '',
      [PerpsEventProperties.DIRECTION]: PerpsEventValues.DIRECTION.LONG,
      [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_ASSET_SCREEN,
    });

    navigateToOrder({
      direction: 'long',
      asset: symbol || '',
    });
  }, [symbol, navigateToOrder, track]);

  // Handle Short button press
  const handleShortPress = useCallback(() => {
    track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
      [PerpsEventProperties.INTERACTION_TYPE]:
        PerpsEventValues.INTERACTION_TYPE.TAP,
      [PerpsEventProperties.ASSET]: symbol || '',
      [PerpsEventProperties.DIRECTION]: PerpsEventValues.DIRECTION.SHORT,
      [PerpsEventProperties.SOURCE]: PerpsEventValues.SOURCE.PERP_ASSET_SCREEN,
    });

    navigateToOrder({
      direction: 'short',
      asset: symbol || '',
    });
  }, [symbol, navigateToOrder, track]);

  // Error state
  if (error) {
    return (
      <SafeAreaView style={styles.container} testID={testID}>
        <View style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            iconColor={IconColor.Default}
            size={ButtonIconSizes.Lg}
            onPress={handleBack}
            testID={PerpsOrderBookViewSelectorsIDs.BACK_BUTTON}
          />
          <View style={styles.headerTitleContainer}>
            <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
              {strings('perps.order_book.title')}
            </Text>
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text variant={TextVariant.BodyMD} color={TextColor.Error}>
            {strings('perps.order_book.error')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      {/* Header */}
      <View style={styles.header}>
        <ButtonIcon
          iconName={IconName.ArrowLeft}
          iconColor={IconColor.Default}
          size={ButtonIconSizes.Lg}
          onPress={handleBack}
          style={styles.headerBackButton}
          testID={PerpsOrderBookViewSelectorsIDs.BACK_BUTTON}
        />
        <View style={styles.headerTitleContainer}>
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {strings('perps.order_book.title')}
          </Text>
        </View>
        {/* Unit Toggle (BTC/USD) */}
        <View style={styles.headerUnitToggle}>
          <TouchableOpacity
            style={[
              styles.headerUnitButton,
              unitDisplay === 'base' && styles.headerUnitButtonActive,
            ]}
            onPress={() => handleUnitChange('base')}
            testID={PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_BASE}
          >
            <Text
              variant={TextVariant.BodySM}
              color={
                unitDisplay === 'base' ? TextColor.Inverse : TextColor.Default
              }
            >
              {symbol}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.headerUnitButton,
              unitDisplay === 'usd' && styles.headerUnitButtonActive,
            ]}
            onPress={() => handleUnitChange('usd')}
            testID={PerpsOrderBookViewSelectorsIDs.UNIT_TOGGLE_USD}
          >
            <Text
              variant={TextVariant.BodySM}
              color={
                unitDisplay === 'usd' ? TextColor.Inverse : TextColor.Default
              }
            >
              USD
            </Text>
          </TouchableOpacity>
        </View>
        {/* Depth Band Dropdown */}
        <Pressable
          style={({ pressed }) => [
            styles.depthBandButton,
            pressed && styles.depthBandButtonPressed,
          ]}
          onPress={handleDepthBandPress}
          testID={PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_BUTTON}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            {currentDepthBandLabel}
          </Text>
          <Icon
            name={IconName.ArrowDown}
            size={IconSize.Xs}
            color={IconColor.Alternative}
          />
        </Pressable>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID={PerpsOrderBookViewSelectorsIDs.SCROLL_VIEW}
      >
        {/* Depth Chart */}
        <View style={[styles.section, styles.depthChartSection]}>
          <PerpsOrderBookDepthChart
            orderBook={orderBook}
            height={100}
            testID={PerpsOrderBookViewSelectorsIDs.DEPTH_CHART}
          />
        </View>

        {/* Order Book Table */}
        <View style={[styles.section, styles.tableSection]}>
          <PerpsOrderBookTable
            orderBook={orderBook}
            symbol={symbol || ''}
            unit={unitDisplay}
            isLoading={isLoading}
            testID={PerpsOrderBookViewSelectorsIDs.TABLE}
          />
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <View style={styles.actionsContainer}>
          <View style={styles.actionButtonWrapper}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.market.long')}
              onPress={handleLongPress}
              testID={PerpsOrderBookViewSelectorsIDs.LONG_BUTTON}
            />
          </View>

          <View style={styles.actionButtonWrapper}>
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={strings('perps.market.short')}
              onPress={handleShortPress}
              testID={PerpsOrderBookViewSelectorsIDs.SHORT_BUTTON}
            />
          </View>
        </View>
      </View>

      {/* Depth Band Selection Bottom Sheet */}
      {isDepthBandSheetVisible && (
        <BottomSheet
          ref={depthBandSheetRef}
          shouldNavigateBack={false}
          onClose={handleDepthBandSheetClose}
        >
          <BottomSheetHeader onClose={handleDepthBandSheetClose}>
            <Text variant={TextVariant.HeadingMD}>
              {strings('perps.order_book.depth_band.title')}
            </Text>
          </BottomSheetHeader>
          <View style={styles.depthBandSheetContent}>
            {DEPTH_BAND_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.depthBandOption,
                  depthBand === option.value && styles.depthBandOptionSelected,
                ]}
                onPress={() => handleDepthBandSelect(option.value)}
                testID={`${PerpsOrderBookViewSelectorsIDs.DEPTH_BAND_OPTION}-${option.value}`}
              >
                <Text
                  variant={TextVariant.BodyLGMedium}
                  color={
                    depthBand === option.value
                      ? TextColor.Primary
                      : TextColor.Default
                  }
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BottomSheet>
      )}
    </SafeAreaView>
  );
};

export default PerpsOrderBookView;
