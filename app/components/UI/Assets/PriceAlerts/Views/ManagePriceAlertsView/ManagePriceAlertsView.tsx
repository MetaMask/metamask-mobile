import React, { useCallback, useContext, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Switch,
  TouchableOpacity,
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
  ButtonIcon,
  ButtonIconSize,
  HeaderStandard,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../../component-library/components/Toast';
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../constants/navigation/Routes';
import { formatPriceWithSubscriptNotation } from '../../../../Predict/utils/format';
import {
  type AbsolutePriceAlert,
  type Alert,
  ManagePriceAlertsTestIds,
  type PercentChangeAlert,
  PriceAlertRouteParams,
  PriceAlertAnalytics,
} from '../../constants';
import {
  deleteAlertByType,
  fetchAlerts,
  normalizeAlerts,
  priceAlertsQueryKey,
  updateAlertByType,
} from '../../api';
import {
  formatPercentAlertSubtitle,
  formatPercentAlertTitle,
} from '../../utils';
import useInFlightIds from '../../hooks/useInFlightIds';
import { useAnalytics } from '../../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

const styles = StyleSheet.create({
  switchDisabled: { opacity: 0.5 },
});

/** Analytics `alert_type` + `alert_period`/`alert_direction` for a given alert. */
const analyticsPropsForAlert = (alert: Alert) =>
  alert.type === 'percent_change'
    ? {
        alert_type: PriceAlertAnalytics.TYPE.PERCENT,
        alert_period: alert.period,
        alert_direction: alert.direction,
      }
    : { alert_type: PriceAlertAnalytics.TYPE.THRESHOLD };

const ManagePriceAlertsView: React.FC = () => {
  const tw = useTailwind();
  const { colors, brandColors } = useTheme();
  const queryClient = useQueryClient();
  const { toastRef } = useContext(ToastContext);
  const navigation = useNavigation<AppStackNavigationProp>();
  const route =
    useRoute<
      RouteProp<
        { ManagePriceAlerts: PriceAlertRouteParams },
        'ManagePriceAlerts'
      >
    >();
  const { symbol, ticker, currentPrice, currentCurrency, assetId } =
    route.params;
  const displayTicker = ticker || symbol;
  const { trackEvent, createEventBuilder } = useAnalytics();

  const hasResolvedInitialFetch = useRef(false);
  const {
    has: isDeleteInFlight,
    add: startDelete,
    remove: finishDelete,
    ids: deletingIds,
  } = useInFlightIds();
  const {
    has: isToggleInFlight,
    add: startToggle,
    remove: finishToggle,
    ids: togglingIds,
  } = useInFlightIds();

  const {
    data: alerts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: priceAlertsQueryKey(assetId),
    queryFn: async (): Promise<Alert[]> => {
      const response = await fetchAlerts(assetId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body: unknown[] = await response.json();
      return normalizeAlerts(body);
    },
    retry: false,
    staleTime: 0,
    cacheTime: 0,
  });

  useEffect(() => {
    if (isLoading || hasResolvedInitialFetch.current) {
      return;
    }
    hasResolvedInitialFetch.current = true;
    if (isError) {
      toastRef?.current?.showToast({
        variant: ToastVariants.Icon,
        iconName: IconName.Danger,
        iconColor: colors.error.default,
        labelOptions: [{ label: strings('price_alerts.fetch_error') }],
        hasNoTimeout: false,
      });
      navigation.goBack();
    } else if (alerts.length === 0) {
      navigation.replace(Routes.CREATE_PRICE_ALERT, {
        symbol,
        ticker,
        currentPrice,
        currentCurrency,
        assetId,
      });
    }
  }, [
    isLoading,
    isError,
    alerts.length,
    navigation,
    symbol,
    ticker,
    currentPrice,
    currentCurrency,
    assetId,
    toastRef,
    colors,
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNavigateToCreate = useCallback(
    (editingAlert?: Alert) => {
      navigation.navigate(Routes.CREATE_PRICE_ALERT, {
        symbol,
        ticker,
        currentPrice,
        currentCurrency,
        assetId,
        fromManage: true,
        existingAbsoluteAlerts: alerts.filter(
          (a): a is AbsolutePriceAlert => a.type === 'absolute_price',
        ),
        existingPercentAlerts: alerts.filter(
          (a): a is PercentChangeAlert => a.type === 'percent_change',
        ),
        editingAlert,
        initialType: editingAlert?.type,
      });
    },
    [
      navigation,
      symbol,
      ticker,
      currentPrice,
      currentCurrency,
      assetId,
      alerts,
    ],
  );

  const handleDeleteAlert = useCallback(
    async (id: string) => {
      if (isDeleteInFlight(id)) return;
      startDelete(id);

      const queryKey = priceAlertsQueryKey(assetId);
      const previous = queryClient.getQueryData<Alert[]>(queryKey) ?? [];
      const target = previous.find((a) => a.id === id);

      try {
        if (!target) throw new Error('Alert not found');
        const response = await deleteAlertByType(target);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.DELETED,
              asset_id: assetId,
              token_symbol: displayTicker,
              ...analyticsPropsForAlert(target),
              alert_value: target.threshold,
              alert_recurring: target.recurring,
              alert_active: target.active,
            })
            .build(),
        );

        const next = previous.filter((a) => a.id !== id);
        queryClient.setQueryData(queryKey, next);
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Trash,
          iconColor: colors.text.default,
          labelOptions: [{ label: strings('price_alerts.delete_success') }],
          hasNoTimeout: false,
        });
        if (next.length === 0) {
          navigation.goBack();
        }
      } catch {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Danger,
          iconColor: colors.error.default,
          labelOptions: [{ label: strings('price_alerts.delete_error') }],
          hasNoTimeout: false,
        });
        const response = await fetchAlerts(assetId).catch(() => null);
        if (response?.ok) {
          const body: unknown[] = await response.json().catch(() => []);
          queryClient.setQueryData(queryKey, normalizeAlerts(body));
        } else {
          queryClient.setQueryData(queryKey, previous);
        }
      } finally {
        finishDelete(id);
      }
    },
    [
      navigation,
      assetId,
      queryClient,
      toastRef,
      colors,
      displayTicker,
      trackEvent,
      createEventBuilder,
      isDeleteInFlight,
      startDelete,
      finishDelete,
    ],
  );

  const handleToggleAlert = useCallback(
    async (id: string, newValue: boolean) => {
      if (isToggleInFlight(id)) return;
      startToggle(id);

      const queryKey = priceAlertsQueryKey(assetId);
      const previous = queryClient.getQueryData<Alert[]>(queryKey) ?? [];
      const toggled = previous.find((a) => a.id === id);
      queryClient.setQueryData(
        queryKey,
        previous.map((a) => (a.id === id ? { ...a, active: newValue } : a)),
      );

      try {
        if (!toggled) throw new Error('Alert not found');
        const response = await updateAlertByType(toggled, {
          active: newValue,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        trackEvent(
          createEventBuilder(MetaMetricsEvents.PRICE_ALERT_CREATION_INTERACTION)
            .addProperties({
              interaction_type: PriceAlertAnalytics.INTERACTION_TYPE.UPDATED,
              asset_id: assetId,
              token_symbol: displayTicker,
              ...analyticsPropsForAlert(toggled),
              alert_value: toggled.threshold,
              alert_recurring: toggled.recurring,
              alert_active: newValue,
              prev_alert_value: toggled.threshold,
              prev_alert_recurring: toggled.recurring,
              prev_alert_active: toggled.active,
            })
            .build(),
        );
      } catch {
        toastRef?.current?.showToast({
          variant: ToastVariants.Icon,
          iconName: IconName.Danger,
          iconColor: colors.error.default,
          labelOptions: [{ label: strings('price_alerts.toggle_error') }],
          hasNoTimeout: false,
        });
        queryClient.setQueryData(
          queryKey,
          previous.map((a) => (a.id === id ? { ...a, active: !newValue } : a)),
        );
      } finally {
        finishToggle(id);
      }
    },
    [
      assetId,
      queryClient,
      toastRef,
      colors,
      displayTicker,
      trackEvent,
      createEventBuilder,
      isToggleInFlight,
      startToggle,
      finishToggle,
    ],
  );

  const renderItem = ({ item }: { item: Alert }) => {
    const isDeleting = deletingIds.has(item.id);
    const isToggling = togglingIds.has(item.id);

    const title =
      item.type === 'percent_change'
        ? formatPercentAlertTitle(item)
        : strings('price_alerts.reaches_threshold', {
            threshold: formatPriceWithSubscriptNotation(
              item.threshold,
              currentCurrency,
              { maximumFractionDigits: 15 },
            ),
          });

    const subtitle =
      item.type === 'percent_change'
        ? formatPercentAlertSubtitle(item)
        : item.recurring
          ? strings('price_alerts.recurring')
          : strings('price_alerts.once_label');

    return (
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 py-3 border-b border-muted"
        testID={`${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-${item.id}`}
      >
        <TouchableOpacity
          onPress={() => handleNavigateToCreate(item)}
          disabled={isDeleting || isToggling}
          style={tw.style('flex-1 mr-3')}
          testID={`${ManagePriceAlertsTestIds.ALERT_EDIT_PREFIX}-${item.id}`}
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
            {title}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {subtitle}
          </Text>
        </TouchableOpacity>

        {isDeleting ? (
          <ActivityIndicator
            size="small"
            color={colors.primary.default}
            testID={`${ManagePriceAlertsTestIds.ALERT_DELETE_SPINNER_PREFIX}-${item.id}`}
            style={tw.style('self-center')}
          />
        ) : (
          <ButtonIcon
            onPress={() => handleDeleteAlert(item.id)}
            size={ButtonIconSize.Md}
            iconName={IconName.Trash}
            testID={`${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-${item.id}`}
            accessibilityLabel="Delete alert"
            style={tw.style('self-center')}
          />
        )}

        <Switch
          value={item.active}
          onValueChange={(v) => handleToggleAlert(item.id, v)}
          disabled={isToggling}
          trackColor={{
            true: colors.primary.default,
            false: colors.border.muted,
          }}
          thumbColor={brandColors.white}
          ios_backgroundColor={colors.border.muted}
          testID={`${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-${item.id}`}
          style={[
            tw.style('ml-3 self-center'),
            isToggling && styles.switchDisabled,
          ]}
        />
      </Box>
    );
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      testID={ManagePriceAlertsTestIds.CONTAINER}
    >
      <Box twClassName="flex-1 bg-default">
        <HeaderStandard
          title={strings('price_alerts.manage_title')}
          onBack={handleBack}
        />

        {isLoading ? (
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="flex-1"
          >
            <ActivityIndicator
              testID={ManagePriceAlertsTestIds.LOADING}
              color={colors.primary.default}
            />
          </Box>
        ) : (
          <Box twClassName="flex-1">
            <FlatList
              data={alerts}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              testID={ManagePriceAlertsTestIds.ALERT_LIST}
            />
          </Box>
        )}

        {!isLoading && alerts.length > 0 && (
          <View style={tw.style('px-4 pb-4 pt-2')}>
            <Button
              variant={ButtonVariant.Primary}
              onPress={() => handleNavigateToCreate()}
              testID={ManagePriceAlertsTestIds.ADD_ALERT_BUTTON}
              twClassName="w-full"
            >
              {strings('price_alerts.add_alert')}
            </Button>
          </View>
        )}
      </Box>
    </SafeAreaView>
  );
};

export default ManagePriceAlertsView;
