import {
  Box,
  Text,
  TextColor,
  TextVariant,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
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
import PredictSportTeamGradient from '../PredictSportTeamGradient/PredictSportTeamGradient';
import PredictSportScoreboard from '../PredictSportScoreboard/PredictSportScoreboard';
import { PredictSportCardFooter } from '../PredictSportCardFooter';

interface PredictMarketSportCardProps {
  market: PredictMarketType;
  testID?: string;
  entryPoint?: PredictEntryPoint;
  onDismiss?: () => void;
}

const PredictMarketSportCard: React.FC<PredictMarketSportCardProps> = ({
  market,
  testID,
  entryPoint = PredictEventValues.ENTRY_POINT.PREDICT_FEED,
  onDismiss,
}) => {
  const resolvedEntryPoint = TrendingFeedSessionManager.getInstance()
    .isFromTrending
    ? PredictEventValues.ENTRY_POINT.TRENDING
    : entryPoint;

  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const tw = useTailwind();

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
      <PredictSportTeamGradient
        awayColor={game?.awayTeam.color ?? '#1a2942'}
        homeColor={game?.homeTeam.color ?? '#3d2621'}
        borderRadius={16}
        style={tw.style('w-full my-[8px]')}
      >
        {onDismiss && (
          <Box twClassName="absolute top-2 right-2 z-10">
            <ButtonIcon
              iconName={IconName.Close}
              size={ButtonIconSize.Sm}
              iconProps={{ color: IconColor.IconDefault }}
              onPress={onDismiss}
              testID={testID ? `${testID}-close-button` : undefined}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          </Box>
        )}
        <Box twClassName="p-4">
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
      </PredictSportTeamGradient>
    </TouchableOpacity>
  );
};

export default PredictMarketSportCard;
