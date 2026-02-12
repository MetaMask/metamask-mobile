import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import Routes from '../../../../../constants/navigation/Routes';
import { SectionRefreshHandle } from '../../types';
import { selectPredictEnabledFlag } from '../../../../UI/Predict';
import { usePredictPositionsForHomepage } from './hooks';
import type { PredictPosition } from '../../../../UI/Predict/types';
import type { PredictNavigationParamList } from '../../../../UI/Predict/types/navigation';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import { PredictPositionRow, PredictPositionRowSkeleton } from './components';

const MAX_POSITIONS_DISPLAYED = 3;
const TITLE = 'Predictions';

/**
 * PredictionsPositionsSection - Displays user's active prediction positions on the homepage.
 *
 * Only renders if the user has active positions.
 * Uses lightweight caching for fast loading.
 */
const PredictionsPositionsSection = forwardRef<SectionRefreshHandle>(
  (_, ref) => {
    const navigation =
      useNavigation<NavigationProp<PredictNavigationParamList>>();
    const isPredictEnabled = useSelector(selectPredictEnabledFlag);

    const { positions, isLoading, refresh } = usePredictPositionsForHomepage(
      MAX_POSITIONS_DISPLAYED,
    );

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const handleViewAllPositions = useCallback(() => {
      navigation.navigate(Routes.PREDICT.ROOT);
    }, [navigation]);

    const handlePositionPress = useCallback(
      (position: PredictPosition) => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: {
            marketId: position.marketId,
            entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
            headerShown: false,
          },
        });
      },
      [navigation],
    );

    // Don't render if Predict is disabled
    if (!isPredictEnabled) {
      return null;
    }

    // Don't render if no positions and not loading
    if (!isLoading && positions.length === 0) {
      return null;
    }

    return (
      <Box gap={0}>
        <SectionTitle title={TITLE} onPress={handleViewAllPositions} />
        <Box>
          {isLoading ? (
            <>
              <PredictPositionRowSkeleton />
              <PredictPositionRowSkeleton />
            </>
          ) : (
            positions.map((position) => (
              <PredictPositionRow
                key={`${position.outcomeId}:${position.outcomeIndex}`}
                position={position}
                onPress={handlePositionPress}
              />
            ))
          )}
        </Box>
      </Box>
    );
  },
);

export default PredictionsPositionsSection;
