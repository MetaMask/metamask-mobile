import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
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
import { formatGameStartTime } from '../../utils/format';

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
  const tw = useTailwind();

  const { date: gameDate, time: gameTime } = formatGameStartTime(
    market.game?.startTime,
  );

  // Derive game state for conditional props
  const isScheduled = market.game?.status === 'scheduled';
  const isOngoing = market.game?.status === 'ongoing';
  const isHalftime = isOngoing && market.game?.period === 'HT';
  const isInProgress = isOngoing && !isHalftime;

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
        awayColor={market.game?.awayTeam.color ?? '#1a2942'}
        homeColor={market.game?.homeTeam.color ?? '#3d2621'}
        borderRadius={16}
        style={tw.style('w-full')}
      >
        <Box twClassName="p-4">
          <Text
            variant={TextVariant.HeadingSm}
            color={TextColor.TextDefault}
            twClassName="text-center font-medium"
          >
            {market.title}
          </Text>

          <PredictSportScoreboard
            awayTeam={{
              abbreviation: market.game?.awayTeam.abbreviation ?? 'TBD',
              color: market.game?.awayTeam.color ?? '#1D4E9B',
            }}
            homeTeam={{
              abbreviation: market.game?.homeTeam.abbreviation ?? 'TBD',
              color: market.game?.homeTeam.color ?? '#FC4C02',
            }}
            gameStatus={market.game?.status ?? 'scheduled'}
            period={market.game?.period}
            homeScore={market.game?.score?.home}
            awayScore={market.game?.score?.away}
            // Pre-game: show scheduled date/time; In-progress: show quarter/elapsed
            date={isScheduled ? gameDate : undefined}
            time={
              isScheduled
                ? gameTime
                : isInProgress
                  ? (market.game?.elapsed ?? undefined)
                  : undefined
            }
            quarter={
              isInProgress ? (market.game?.period ?? undefined) : undefined
            }
            turn={market.game?.turn}
            testID={testID ? `${testID}-scoreboard` : undefined}
          />

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="w-full"
          >
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={
                <Text
                  variant={TextVariant.BodyLg}
                  style={tw.style('font-medium text-white')}
                >
                  {`${market.game?.awayTeam.abbreviation ?? 'TBD'} 77¢`}
                </Text>
              }
              onPress={() => {
                // TODO: Implement team selection handler
              }}
              style={tw.style(
                'w-[48.5%] py-0',
                `bg-[${market.game?.awayTeam.color ?? '#1D4E9B'}]`,
              )}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
              label={
                <Text
                  variant={TextVariant.BodyLg}
                  style={tw.style('font-medium text-white')}
                >
                  {`${market.game?.homeTeam.abbreviation ?? 'TBD'} 23¢`}
                </Text>
              }
              onPress={() => {
                // TODO: Implement team selection handler
              }}
              style={tw.style(
                'w-[48.5%] py-0',
                `bg-[${market.game?.homeTeam.color ?? '#FC4C02'}]`,
              )}
            />
          </Box>
        </Box>
      </PredictSportTeamGradient>
    </TouchableOpacity>
  );
};

export default PredictMarketSportCard;
