import { type NavigationProp, useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictEventValues } from '../../constants/eventNames';
import type { PredictPortfolioModel } from '../../hooks/usePredictPortfolio';
import { PredictPositionsListSelectorsIDs } from '../../Predict.testIds';
import type { PredictPosition } from '../../types';
import type { PredictNavigationParamList } from '../../types/navigation';
import PredictPositionItem from '../PredictPosition/PredictPosition';
import PredictPositionsEmpty from '../PredictPositionsEmpty';
import PredictPositionResolved from '../PredictPositionResolved/PredictPositionResolved';

const SKELETON_ROW_COUNT = 3;

interface PredictPositionsListProps {
  isPrivacyMode: boolean;
  portfolio: PredictPortfolioModel;
}

const PredictPositionsListSkeleton = () => {
  const tw = useTailwind();

  return (
    <Box
      testID={PredictPositionsListSelectorsIDs.LOADING_STATE}
      twClassName="gap-3 py-4"
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, index) => (
        <Box
          key={index}
          testID={PredictPositionsListSelectorsIDs.SKELETON_ROW}
          twClassName="flex-row items-start gap-4 py-2"
        >
          <Skeleton width={40} height={40} style={tw.style('rounded-full')} />
          <Box twClassName="flex-1 gap-2">
            <Skeleton width="100%" height={18} style={tw.style('rounded-md')} />
            <Skeleton width="70%" height={16} style={tw.style('rounded-md')} />
          </Box>
          <Box twClassName="items-end gap-2">
            <Skeleton width={64} height={18} style={tw.style('rounded-md')} />
            <Skeleton width={48} height={16} style={tw.style('rounded-md')} />
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const PredictPositionsList = ({
  isPrivacyMode,
  portfolio,
}: PredictPositionsListProps) => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const tw = useTailwind();
  const claimablePositions = useMemo(
    () =>
      [...portfolio.actionableClaimablePositions].sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
      ),
    [portfolio.actionableClaimablePositions],
  );
  const openPositions = portfolio.openPositions;
  const hasPositions =
    claimablePositions.length > 0 || openPositions.length > 0;

  const handlePositionPress = useCallback(
    (position: PredictPosition) => {
      navigation.navigate(Routes.PREDICT.MARKET_DETAILS, {
        marketId: position.marketId,
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
      });
    },
    [navigation],
  );

  if (portfolio.isPositionsLoading && !hasPositions) {
    return <PredictPositionsListSkeleton />;
  }

  if (!hasPositions) {
    return <PredictPositionsEmpty />;
  }

  return (
    <ScrollView
      contentContainerStyle={tw.style('pb-8 pt-3')}
      showsVerticalScrollIndicator={false}
      style={tw.style('flex-1')}
      testID={PredictPositionsListSelectorsIDs.CONTAINER}
    >
      {claimablePositions.length > 0 && (
        <Box testID={PredictPositionsListSelectorsIDs.CLAIMABLE_POSITIONS_LIST}>
          {claimablePositions.map((position) => (
            <PredictPositionResolved
              key={`${position.outcomeId}:${position.outcomeIndex}`}
              position={position}
              onPress={handlePositionPress}
              privacyMode={isPrivacyMode}
            />
          ))}
        </Box>
      )}

      {openPositions.length > 0 && (
        <Box
          testID={PredictPositionsListSelectorsIDs.OPEN_POSITIONS_LIST}
          twClassName={claimablePositions.length > 0 ? 'pt-1' : undefined}
        >
          {openPositions.map((position) => (
            <PredictPositionItem
              key={`${position.outcomeId}:${position.outcomeIndex}`}
              position={position}
              onPress={handlePositionPress}
              privacyMode={isPrivacyMode}
            />
          ))}
        </Box>
      )}
    </ScrollView>
  );
};

export default PredictPositionsList;
