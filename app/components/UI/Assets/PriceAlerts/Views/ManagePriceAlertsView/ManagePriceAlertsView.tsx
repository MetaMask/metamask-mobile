import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
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
import type { StackNavigationProp } from '@react-navigation/stack';
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
  ManagePriceAlertsTestIds,
  PriceAlert,
  PriceAlertRouteParams,
} from '../../constants';
import {
  fetchAlerts,
  deleteAlert,
  updateAlert,
  priceAlertsQueryKey,
} from '../../api';

const styles = StyleSheet.create({
  switchDisabled: { opacity: 0.5 },
});

const ManagePriceAlertsView: React.FC = () => {
  const tw = useTailwind();
  const { colors, brandColors } = useTheme();
  const queryClient = useQueryClient();
  const { toastRef } = useContext(ToastContext);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<StackNavigationProp<any>>();
  const route =
    useRoute<
      RouteProp<
        { ManagePriceAlerts: PriceAlertRouteParams },
        'ManagePriceAlerts'
      >
    >();
  const { symbol, ticker, currentPrice, currentCurrency, assetId } =
    route.params;

  const hasResolvedInitialFetch = useRef(false);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [togglingIds, setTogglingIds] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const inFlightDeletes = useRef(new Set<string>());
  const inFlightToggles = useRef(new Set<string>());

  const {
    data: alerts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: priceAlertsQueryKey(assetId),
    queryFn: async (): Promise<PriceAlert[]> => {
      const response = await fetchAlerts(assetId);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
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
    if (isError || alerts.length === 0) {
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
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleNavigateToCreate = useCallback(
    (editingAlert?: PriceAlert) => {
      navigation.navigate(Routes.CREATE_PRICE_ALERT, {
        symbol,
        ticker,
        currentPrice,
        currentCurrency,
        assetId,
        fromManage: true,
        existingThresholds: alerts.map((a) => a.threshold),
        editingAlert,
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
      if (inFlightDeletes.current.has(id)) return;
      inFlightDeletes.current.add(id);
      setDeletingIds((prev) => new Set(prev).add(id));

      const queryKey = priceAlertsQueryKey(assetId);
      const previous = queryClient.getQueryData<PriceAlert[]>(queryKey) ?? [];

      try {
        const response = await deleteAlert(id);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

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
        const response = await fetchAlerts(assetId).catch(() => null);
        if (response?.ok) {
          const data: PriceAlert[] = await response.json().catch(() => []);
          queryClient.setQueryData(queryKey, data);
        } else {
          queryClient.setQueryData(queryKey, previous);
        }
      } finally {
        inFlightDeletes.current.delete(id);
        setDeletingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [navigation, assetId, queryClient, toastRef, colors],
  );

  const handleToggleAlert = useCallback(
    async (id: string, newValue: boolean) => {
      if (inFlightToggles.current.has(id)) return;
      inFlightToggles.current.add(id);
      setTogglingIds((prev) => new Set(prev).add(id));

      const queryKey = priceAlertsQueryKey(assetId);
      const previous = queryClient.getQueryData<PriceAlert[]>(queryKey) ?? [];
      queryClient.setQueryData(
        queryKey,
        previous.map((a) => (a.id === id ? { ...a, active: newValue } : a)),
      );

      try {
        const response = await updateAlert(id, { active: newValue });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      } catch {
        queryClient.setQueryData(
          queryKey,
          previous.map((a) => (a.id === id ? { ...a, active: !newValue } : a)),
        );
      } finally {
        inFlightToggles.current.delete(id);
        setTogglingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [assetId, queryClient],
  );

  const renderItem = ({ item }: { item: PriceAlert }) => {
    const isDeleting = deletingIds.has(item.id);
    const isToggling = togglingIds.has(item.id);

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
            {strings('price_alerts.reaches_threshold', {
              threshold: formatPriceWithSubscriptNotation(
                item.threshold,
                currentCurrency,
                { maximumFractionDigits: 15 },
              ),
            })}
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {item.recurring
              ? strings('price_alerts.recurring')
              : strings('price_alerts.once_label')}
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
