import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { type Position } from '@metamask/perps-controller';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import ErrorState from '../../components/ErrorState';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPerpsEnabledFlag } from '../../../../UI/Perps';
import {
  selectCachedPositions,
  selectCachedMarketData,
} from '../../../../UI/Perps/selectors/perpsController';
import PerpsPositionRow from './components/PerpsPositionRow';
import PerpsPositionRowSkeleton from './components/PerpsPositionRow/PerpsPositionRowSkeleton';
import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';

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
  const [error, setError] = useState<boolean>(false);

  const startPreload = useCallback(async () => {
    const controller = Engine.context.PerpsController;
    if (!controller) return;

    setError(false);
    try {
      await controller.startMarketDataPreload();
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    if (!isPerpsEnabled) return;

    startPreload();
    return () => Engine.context.PerpsController?.stopMarketDataPreload();
  }, [isPerpsEnabled, startPreload]);

  const isLoading = cachedPositions === null && !error;

  const positions = useMemo(
    () => (cachedPositions ?? []).slice(0, MAX_POSITIONS),
    [cachedPositions],
  );

  const refresh = useCallback(async () => {
    await startPreload();
  }, [startPreload]);

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

  const hasError = !isLoading && positions.length === 0 && error;

  if (hasError) {
    return (
      <Box gap={3}>
        <SectionTitle title={title} onPress={handleViewAllPerps} />
        <ErrorState
          title={strings('homepage.error.unable_to_load', {
            section: title.toLowerCase(),
          })}
          onRetry={refresh}
        />
      </Box>
    );
  }

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllPerps} />
      <SectionRow>
        {isLoading ? (
          <PerpsPositionRowSkeleton />
        ) : (
          <View testID="homepage-perps-positions">
            {positions.map((position) => (
              <PerpsPositionRow
                key={`pos-${position.symbol}-${position.size}`}
                position={position}
                onPress={() => handlePositionPress(position)}
              />
            ))}
          </View>
        )}
      </SectionRow>
    </Box>
  );
});

export default PerpsSection;
