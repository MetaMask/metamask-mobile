import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { PredictMarket as PredictMarketType } from '../../types';
import {
  PredictNavigationParamList,
  PredictEntryPoint,
} from '../../types/navigation';
import { PredictEventValues } from '../../constants/eventNames';
import Routes from '../../../../../constants/navigation/Routes';
import TrendingFeedSessionManager from '../../../Trending/services/TrendingFeedSessionManager';
import PredictSportScoreboard from '../PredictSportScoreboard/PredictSportScoreboard';
import { PredictSportCardFooter } from '../PredictSportCardFooter';

interface PredictMarketSportCardProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
}

const PredictMarketSportCard: React.FC<PredictMarketSportCardProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
}) => {
  const resolvedEntryPoint = TrendingFeedSessionManager.getInstance()
    .isFromTrending
    ? PredictEventValues.ENTRY_POINT.TRENDING
    : entryPoint;

  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();

  const game = market.game;

  return (
    <TouchableOpacity
      testID={testID}
      onPress={() => {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.MARKET_DETAILS,
          params: {
            marketId: market.id,
            entryPoint: resolvedEntryPoint,
            title: market.title,
            image: market.image,
          },
        });
      }}
    >
      <Box twClassName="p-4 bg-muted my-[8px] rounded-xl">
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          twClassName="text-center font-medium"
        >
          {market.title}
        </Text>

        {game && (
          <PredictSportScoreboard
            game={game}
            testID={testID ? `${testID}-scoreboard` : undefined}
          />
        )}

        <PredictSportCardFooter
          market={market}
          entryPoint={resolvedEntryPoint}
          testID={testID ? `${testID}-footer` : undefined}
        />
      </Box>
    </TouchableOpacity>
  );
};

export default PredictMarketSportCard;
