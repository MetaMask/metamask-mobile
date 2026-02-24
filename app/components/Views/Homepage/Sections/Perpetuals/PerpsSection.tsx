import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { type Position } from '@metamask/perps-controller';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import {
  selectCachedPositions,
  selectCachedMarketData,
} from '../../../../UI/Perps/selectors/perpsController';
import PerpsPositionCard from '../../../../UI/Perps/components/PerpsPositionCard/PerpsPositionCard';
import PerpsPositionSkeleton from './components/PerpsPositionSkeleton';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import { PerpsCacheInvalidator } from '../../../../UI/Perps/services/PerpsCacheInvalidator';

const MAX_POSITIONS = 5;

/**
 * PerpsSection - Displays open perpetual positions on the homepage.
 *
 * Shows up to 5 cached positions. Only renders when the perps feature flag is enabled.
 */
const PerpsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const cachedPositions = useSelector(selectCachedPositions);
  const cachedMarkets = useSelector(selectCachedMarketData);
  const title = strings('homepage.sections.perpetuals');

  const refreshData = useCallback(() => {
    const controller = Engine.context.PerpsController;
    if (!controller) return;

    controller.startMarketDataPreload();
  }, []);

  useEffect(() => {
    if (!isPerpsEnabled) return;
    refreshData();
  }, [isPerpsEnabled, refreshData]);

  // Re-fetch when positions change (e.g., user closes a position in perps)
  useEffect(() => {
    if (!isPerpsEnabled) return;

    let invalidationTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleInvalidation = () => {
      if (invalidationTimeout) {
        clearTimeout(invalidationTimeout);
      }
      invalidationTimeout = setTimeout(() => {
        refreshData();
      }, 10);
    };

    const unsubPositions = PerpsCacheInvalidator.subscribe(
      'positions',
      handleInvalidation,
    );

    return () => {
      if (invalidationTimeout) {
        clearTimeout(invalidationTimeout);
      }
      unsubPositions();
    };
  }, [isPerpsEnabled, refreshData]);

  const isLoading = cachedPositions === null;

  const positions = useMemo(
    () => (cachedPositions ?? []).slice(0, MAX_POSITIONS),
    [cachedPositions],
  );

  const refresh = useCallback(async () => {
    refreshData();
  }, [refreshData]);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const handleViewAllPerps = useCallback(() => {
    navigation.navigate(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  }, [navigation]);

  const handlePositionPress = useCallback(
    (position: Position) => {
      const fullMarket = cachedMarkets?.find(
        (m) => m.symbol === position.symbol,
      );
      navigation.navigate(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: fullMarket ?? {
            symbol: position.symbol,
            maxLeverage: position.maxLeverage,
          },
          initialTab: 'position',
        },
      });
    },
    [navigation, cachedMarkets],
  );

  if (!isPerpsEnabled) {
    return null;
  }

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllPerps} />
      <SectionRow>
        {isLoading ? (
          <PerpsPositionSkeleton />
        ) : (
          <View testID="homepage-perps-positions">
            {positions.map((position) => (
              <PerpsPositionCard
                key={`pos-${position.symbol}-${position.size}`}
                position={position}
                compact
                compactVariant="position"
                iconSize={36}
                onPress={() => handlePositionPress(position)}
                testID={`perps-position-row-${position.symbol}`}
              />
            ))}
          </View>
        )}
      </SectionRow>
    </Box>
  );
});

export default PerpsSection;
