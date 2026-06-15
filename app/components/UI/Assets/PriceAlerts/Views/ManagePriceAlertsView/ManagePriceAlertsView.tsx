import React, { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, FlatList, Switch, View } from 'react-native';
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
import { IconName } from '../../../../../../component-library/components/Icons/Icon';
import Routes from '../../../../../../constants/navigation/Routes';
import { formatPriceWithSubscriptNotation } from '../../../../Predict/utils/format';
import {
  ManagePriceAlertsTestIds,
  PriceAlert,
  PriceAlertRouteParams,
} from '../../constants';
import { fetchAlerts } from '../../api';

const ManagePriceAlertsView: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
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

  const {
    data: alerts = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['priceAlerts', assetId],
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
    if (!isLoading && (isError || alerts.length === 0)) {
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

  const handleAddAlert = useCallback(() => {
    navigation.navigate(Routes.CREATE_PRICE_ALERT, {
      symbol,
      ticker,
      currentPrice,
      currentCurrency,
      assetId,
      fromManage: true,
    });
  }, [navigation, symbol, ticker, currentPrice, currentCurrency, assetId]);

  const renderItem = ({ item }: { item: PriceAlert }) => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4 py-3 border-b border-muted"
      testID={`${ManagePriceAlertsTestIds.ALERT_ITEM_PREFIX}-${item.id}`}
    >
      <Box twClassName="flex-1 mr-3">
        <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
          {strings('price_alerts.reaches_threshold', {
            threshold: formatPriceWithSubscriptNotation(
              item.threshold,
              currentCurrency,
            ),
          })}
        </Text>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {item.recurring
            ? strings('price_alerts.recurring')
            : strings('price_alerts.once_label')}
        </Text>
      </Box>

      <ButtonIcon
        onPress={() => {
          // TODO: delete alert
        }}
        size={ButtonIconSize.Md}
        iconName={IconName.Trash}
        testID={`${ManagePriceAlertsTestIds.ALERT_DELETE_PREFIX}-${item.id}`}
        accessibilityLabel="Delete alert"
        style={tw.style('self-center')}
      />

      <Switch
        value={item.active}
        onValueChange={() => {
          // TODO: toggle alert active state
        }}
        trackColor={{
          true: colors.primary.default,
          false: colors.border.muted,
        }}
        thumbColor={colors.background.default}
        ios_backgroundColor={colors.border.muted}
        testID={`${ManagePriceAlertsTestIds.ALERT_TOGGLE_PREFIX}-${item.id}`}
        style={tw.style('ml-3 self-center')}
      />
    </Box>
  );

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
              onPress={handleAddAlert}
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
