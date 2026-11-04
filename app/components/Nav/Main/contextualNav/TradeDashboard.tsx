import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';

import Routes from '../../../../constants/navigation/Routes';
import { useFloatingTabBarInset } from '../../../../component-library/components/Navigation/TabBarFloating';
import {
  enterCollectiblesSection,
  enterTradingHub,
  type TradingHubTab,
} from './contextualSection';
import { tradingHubRouteName } from './tradeHubRoutes';
import { useTradingHubAvailability } from './useTradingHubAvailability';

/**
 * Trade tab. Links into the trading hubs and Collectibles. It does not open
 * Swap on its own.
 */
const TradeDashboard = () => {
  const navigation = useNavigation();
  const tabBarInset = useFloatingTabBarInset();
  const availability = useTradingHubAvailability();

  const openHub = useCallback(
    (hub: TradingHubTab) => {
      enterTradingHub(hub);
      navigation.navigate(tradingHubRouteName(hub, availability));
    },
    [availability, navigation],
  );

  const openCollectibles = useCallback(() => {
    enterCollectiblesSection();
    navigation.navigate(Routes.COLLECTIBLES_VIEW);
  }, [navigation]);

  return (
    <Box
      twClassName="flex-1 bg-default"
      padding={4}
      gap={4}
      style={{ paddingBottom: tabBarInset }}
      testID="trade-dashboard"
    >
      <Text variant={TextVariant.HeadingLg} accessibilityRole="header">
        Trade
      </Text>
      <Text variant={TextVariant.BodyMd}>
        Swap, perps, predictions, and collectibles.
      </Text>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={() => openHub('swap')}
        accessibilityLabel="Swap"
        testID="trade-dashboard-swap"
      >
        Swap
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={() => openHub('perps')}
        accessibilityLabel="Perps"
        testID="trade-dashboard-perps"
      >
        Perps
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={() => openHub('predictions')}
        accessibilityLabel="Predictions"
        testID="trade-dashboard-predictions"
      >
        Predictions
      </Button>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={openCollectibles}
        accessibilityLabel="Collectibles"
        testID="trade-dashboard-collectibles"
      >
        Collectibles
      </Button>
    </Box>
  );
};

export default TradeDashboard;
