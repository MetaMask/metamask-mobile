import React, { useCallback } from 'react';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { PredictPosition as PredictPositionType } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import { PredictPositionsSelectorsIDs } from '../../Predict.testIds';
import PredictPosition from '../PredictPosition/PredictPosition';
import PredictPositionResolved from '../PredictPositionResolved/PredictPositionResolved';
import PredictNewButton from '../PredictNewButton';

interface PredictHomePositionListProps {
  activePositions: PredictPositionType[];
  claimablePositions: PredictPositionType[];
}

const PredictHomePositionList: React.FC<PredictHomePositionListProps> = ({
  activePositions,
  claimablePositions,
}) => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const handlePositionPress = useCallback(
    (marketId: string) => {
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId,
          entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
          headerShown: false,
        },
      });
    },
    [navigation],
  );

  const sortedClaimablePositions = [...claimablePositions].sort(
    (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
  );

  return (
    <>
      <Box testID={PredictPositionsSelectorsIDs.ACTIVE_POSITIONS_LIST}>
        {activePositions.map((item) => (
          <PredictPosition
            key={`${item.outcomeId}:${item.outcomeIndex}`}
            position={item}
            onPress={() => handlePositionPress(item.marketId)}
          />
        ))}
      </Box>

      <PredictNewButton />

      {claimablePositions.length > 0 && (
        <>
          <Box>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mb-4"
            >
              {strings('predict.tab.resolved_markets')}
            </Text>
          </Box>
          <Box testID={PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST}>
            {sortedClaimablePositions.map((item) => (
              <PredictPositionResolved
                key={`${item.outcomeId}:${item.outcomeIndex}`}
                position={item}
                onPress={() => handlePositionPress(item.marketId)}
              />
            ))}
          </Box>
        </>
      )}
    </>
  );
};

export default PredictHomePositionList;
