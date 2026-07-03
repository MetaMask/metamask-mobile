import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Animated,
  StyleSheet,
  Switch,
  Text as RNText,
  View,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { AppStackNavigationProp } from '../../../../../../core/NavigationService/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import KeypadComponent, {
  type KeypadChangeData,
} from '../../../../../Base/Keypad';
import { formatPriceWithSubscriptNotation } from '../../../../Predict/utils/format';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import {
  CreatePriceAlertRouteParams,
  CreatePriceAlertTestIds,
  CURRENCY_SYMBOLS,
  PRICE_ALERT_QUICK_PERCENTAGES,
  PriceAlert,
  PriceAlertAnalytics,
} from '../../constants';
import { priceAlertsQueryKey, useSubmitPriceAlert } from '../../api';
import { trimTrailingZeros } from '../../../../Bridge/utils/trimTrailingZeros';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const KEYPAD_EMPTY = '0';
const MIN_KEYPAD_DECIMALS = 2;
const MAX_KEYPAD_DECIMALS = 15;
const SIG_FIGS_FRACTIONAL_OFFSET = 5;

/**
 * Max fractional digits the keypad should allow for a given USD price.
 * Mirrors the precision used by {@link toKeypadString} so manual entry and
 * quick-percentage pills stay consistent (e.g. sub-cent SHIB prices).
 * Capped at {@link MAX_KEYPAD_DECIMALS} to prevent excessively long inputs.
 */
const getKeypadDecimalPlaces = (price: number): number => {
  if (!Number.isFinite(price) || price <= 0) {
    return MIN_KEYPAD_DECIMALS;
  }
  const exponent = Math.floor(Math.log10(price));
  const places =
    exponent >= 0
      ? Math.max(MIN_KEYPAD_DECIMALS, SIG_FIGS_FRACTIONAL_OFFSET - exponent)
      : Math.abs(exponent) + SIG_FIGS_FRACTIONAL_OFFSET;
  return Math.min(places, MAX_KEYPAD_DECIMALS);
};

/**
 * Converts a computed price into a plain decimal string suitable for the keypad.
 * Always preserves 6 significant figures and never produces scientific notation.
 * e.g. 0.3224 * 1.10 → "0.35464", 1.05e-14 → "0.000000000000011".
 */
const toKeypadString = (price: number): string => {
  if (!Number.isFinite(price) || price <= 0) return KEYPAD_EMPTY;

  const decimalPlaces = getKeypadDecimalPlaces(price);
  const str = trimTrailingZeros(price.toFixed(decimalPlaces));

  return str || KEYPAD_EMPTY;
};

const viewStyles = StyleSheet.create({
  priceText: {
    fontSize: 48,
    flexShrink: 1,
    maxWidth: '95%',
  },
  cursor: {
    flexShrink: 0,
  },
});

const CreatePriceAlertView: React.FC = () => {
  const tw = useTailwind();
  const { colors, brandColors } = useTheme();
  const navigation = useNavigation<AppStackNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        { CreatePriceAlert: CreatePriceAlertRouteParams },
        'CreatePriceAlert'
      >
    >();
  const {
    symbol,
    ticker,
    currentPrice,
    currentCurrency,
    assetId,
    fromManage,
    existingThresholds,
    editingAlert,
  } = route.params;

  const { trackEvent, createEventBuilder } = useAnalytics();

  const isEditing = Boolean(editingAlert);
  const displayTicker = ticker || symbol;

  // "Price Alert Creation Initiated" — fired once when the user lands on the
  // Create screen for a *new* alert (not when editing an existing one).
  // `has_existing_alert` is derived from the thresholds Manage passes through;
  // when the screen is reached directly (no prior alerts) the list is absent.
  useEffect(() => {
    if (isEditing) {
      return;
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_VIEWED)
        .addProperties({
          asset_id: assetId,
          token_symbol: displayTicker,
          has_existing_alert: (existingThresholds?.length ?? 0) > 0,
        })
        .build(),
    );
    // Intentionally fire once on mount; route params are stable for the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [targetAmount, setTargetAmount] = useState(
    editingAlert ? toKeypadString(editingAlert.threshold) : KEYPAD_EMPTY,
  );
  const [isRecurring, setIsRecurring] = useState(
    editingAlert?.recurring ?? true,
  );
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [fadeAnim]);

  const hasInput = targetAmount !== KEYPAD_EMPTY;

  const targetPrice = useMemo(() => {
    const parsed = parseFloat(targetAmount);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [targetAmount]);

  const hasValidTarget = targetPrice > 0;

  const isDuplicateThreshold = useMemo(
    () =>
      hasValidTarget &&
      (existingThresholds ?? []).some(
        (t) => t === targetPrice && t !== editingAlert?.threshold,
      ),
    [hasValidTarget, existingThresholds, targetPrice, editingAlert],
  );

  const isUnchanged = useMemo(
    () =>
      isEditing &&
      targetPrice === editingAlert?.threshold &&
      isRecurring === editingAlert?.recurring,
    [isEditing, editingAlert, targetPrice, isRecurring],
  );

  const percentDiff = useMemo(() => {
    if (!hasInput || currentPrice <= 0 || targetPrice <= 0) {
      return { rounded: 0, direction: 'none' as const };
    }
    const percent = ((targetPrice - currentPrice) / currentPrice) * 100;
    const rounded = Math.round(percent);
    if (rounded > 0) return { rounded, direction: 'above' as const };
    if (rounded < 0)
      return { rounded: Math.abs(rounded), direction: 'below' as const };
    return { rounded: 0, direction: 'none' as const };
  }, [hasInput, currentPrice, targetPrice]);

  // While typing, show the raw digits the user entered (e.g. "1", "12.", "12.5").
  // Only format with currency notation for the placeholder and after a quick-percentage press.
  const displayText = useMemo(() => {
    if (!hasInput) {
      return formatPriceWithSubscriptNotation(currentPrice, currentCurrency);
    }
    // Prepend the currency symbol but keep the raw keypad string intact so
    // no unexpected decimals appear while the user is mid-entry.
    const currencySymbol =
      CURRENCY_SYMBOLS[currentCurrency.toLowerCase()] ?? '';
    return `${currencySymbol}${targetAmount}`;
  }, [hasInput, currentPrice, currentCurrency, targetAmount]);

  const formattedCurrentPrice = useMemo(
    () => formatPriceWithSubscriptNotation(currentPrice, currentCurrency),
    [currentCurrency, currentPrice],
  );

  const keypadDecimals = useMemo(
    () => getKeypadDecimalPlaces(currentPrice),
    [currentPrice],
  );

  const { submit, isSubmitting } = useSubmitPriceAlert(editingAlert);
  const queryClient = useQueryClient();
  const { toastRef } = useContext(ToastContext);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSaveAlert = useCallback(async () => {
    if (!hasValidTarget) {
      return;
    }
    try {
      await submit({
        asset: assetId,
        threshold: targetPrice,
        recurring: isRecurring,
      });
      if (isEditing && editingAlert) {
        queryClient.setQueryData<PriceAlert[]>(
          priceAlertsQueryKey(assetId),
          (prev) =>
            prev?.map((a) =>
              a.id === editingAlert.id
                ? { ...a, threshold: targetPrice, recurring: isRecurring }
                : a,
            ),
        );
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.UPDATED,
              asset_id: assetId,
              token_symbol: displayTicker,
              alert_type: PriceAlertAnalytics.TYPE.THRESHOLD,
              alert_value: targetPrice,
              alert_recurring: isRecurring,
              alert_active: editingAlert.active,
              prev_alert_value: editingAlert.threshold,
              prev_alert_recurring: editingAlert.recurring,
              prev_alert_active: editingAlert.active,
            })
            .build(),
        );
      } else {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.CREATED,
              asset_id: assetId,
              token_symbol: displayTicker,
              alert_type: PriceAlertAnalytics.TYPE.THRESHOLD,
              alert_value: targetPrice,
              alert_recurring: isRecurring,
              alert_active: true,
            })
            .build(),
        );
      }
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Confirmation,
        iconColor: colors.success.default,
        labelOptions: [
          {
            label: strings('price_alerts.save_success', {
              ticker: displayTicker,
            }),
          },
        ],
        hasNoTimeout: false,
      });
      // Editing always returns to Manage. Creating from Manage pops both screens to land on TokenDetails.
      if (isEditing || !fromManage) {
        navigation.goBack();
      } else {
        navigation.pop(2);
      }
    } catch {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        iconColor: colors.error.default,
        labelOptions: [{ label: strings('price_alerts.save_error') }],
        hasNoTimeout: false,
      });
    }
  }, [
    submit,
    assetId,
    targetPrice,
    hasValidTarget,
    isRecurring,
    isEditing,
    editingAlert,
    queryClient,
    fromManage,
    navigation,
    toastRef,
    colors,
    displayTicker,
    trackEvent,
    createEventBuilder,
  ]);

  const handleKeypadChange = useCallback(({ value }: KeypadChangeData) => {
    setTargetAmount(value);
  }, []);

  const handleQuickPercentagePress = useCallback(
    (percentage: number) => {
      if (currentPrice <= 0) {
        return;
      }
      const nextPrice = currentPrice * (1 + percentage / 100);
      setTargetAmount(toKeypadString(nextPrice));
    },
    [currentPrice],
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={CreatePriceAlertTestIds.CONTAINER}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          title={strings(
            isEditing ? 'price_alerts.edit_title' : 'price_alerts.create_title',
            { ticker: displayTicker },
          )}
          subtitle={formattedCurrentPrice}
          onBack={handleBack}
        />

        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="flex-1 justify-center px-4 pb-4"
        >
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="mb-2"
          >
            {strings('price_alerts.enter_target_price')}
          </Text>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="w-full"
            testID={CreatePriceAlertTestIds.TARGET_PRICE_INPUT}
          >
            <RNText
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.4}
              style={[
                tw.style('font-medium'),
                viewStyles.priceText,
                {
                  color: hasInput
                    ? colors.text.default
                    : colors.text.alternative,
                },
              ]}
            >
              {displayText}
            </RNText>
            <Animated.View
              style={[
                tw.style('ml-1 h-10 w-0.5 bg-primary-default'),
                viewStyles.cursor,
                { opacity: fadeAnim },
              ]}
            />
          </Box>

          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            testID={CreatePriceAlertTestIds.PERCENT_DIFF}
            twClassName="mt-2"
          >
            {percentDiff.direction === 'none' ? (
              strings('price_alerts.approx_percent', { percent: '0' })
            ) : (
              <>
                {'≈ '}
                <Text
                  variant={TextVariant.BodySm}
                  fontWeight={FontWeight.Medium}
                  color={
                    percentDiff.direction === 'above'
                      ? TextColor.SuccessDefault
                      : TextColor.ErrorDefault
                  }
                >
                  {`${percentDiff.direction === 'above' ? '+' : '-'}${percentDiff.rounded}%`}
                </Text>
                {` ${strings(
                  percentDiff.direction === 'above'
                    ? 'price_alerts.approx_percent_above'
                    : 'price_alerts.approx_percent_below',
                  { ticker: displayTicker },
                )}`}
              </>
            )}
          </Text>
        </Box>

        <View style={tw.style('px-4 pb-2')}>
          {/* Recurring toggle */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mb-3 px-2"
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('price_alerts.recurring')}
            </Text>
            <Switch
              value={isRecurring}
              onValueChange={setIsRecurring}
              trackColor={{
                true: colors.primary.default,
                false: colors.border.muted,
              }}
              thumbColor={brandColors.white}
              ios_backgroundColor={colors.border.muted}
              testID={CreatePriceAlertTestIds.RECURRING_TOGGLE}
            />
          </Box>

          {/* Quick-percentage pickers */}
          <Box flexDirection={BoxFlexDirection.Row} twClassName="mb-3 gap-2">
            {PRICE_ALERT_QUICK_PERCENTAGES.map((percentage) => (
              <Button
                key={percentage}
                variant={ButtonVariant.Secondary}
                onPress={() => handleQuickPercentagePress(percentage)}
                testID={`${CreatePriceAlertTestIds.QUICK_PERCENTAGE_PREFIX}-${percentage}`}
                twClassName="flex-1"
              >
                {strings('price_alerts.quick_percentage', {
                  percentage: percentage > 0 ? `+${percentage}` : percentage,
                })}
              </Button>
            ))}
          </Box>

          {/* "price_alert" is intentionally not in the Keypad CURRENCIES map —
              unknown codes fall through to the decimals-aware branch in useCurrency,
              which is the only path that actually enforces the decimals cap. */}
          <KeypadComponent
            value={targetAmount}
            onChange={handleKeypadChange}
            currency="price_alert"
            decimals={keypadDecimals}
          />

          {/* Save button — sits below the keypad */}
          <Button
            variant={ButtonVariant.Primary}
            onPress={handleSaveAlert}
            isLoading={isSubmitting}
            isDisabled={
              isSubmitting ||
              !hasValidTarget ||
              isDuplicateThreshold ||
              isUnchanged
            }
            testID={CreatePriceAlertTestIds.SET_ALERT_BUTTON}
            twClassName="mt-3 w-full"
          >
            {isDuplicateThreshold
              ? strings('price_alerts.duplicate_threshold')
              : strings(
                  isEditing
                    ? 'price_alerts.update_price_alert'
                    : 'price_alerts.set_price_alert',
                )}
          </Button>
        </View>
      </Box>
    </SafeAreaView>
  );
};

export default CreatePriceAlertView;
