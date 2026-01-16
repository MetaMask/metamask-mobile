import React, { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import PredictShareButton from '../PredictShareButton/PredictShareButton';
import { PredictGameDetailsFooter } from '../PredictGameDetailsFooter';
import PredictGameAboutSheet from '../PredictGameDetailsFooter/PredictGameAboutSheet';
import { usePredictBottomSheet } from '../../hooks/usePredictBottomSheet';
import { PredictGameDetailsContentProps } from './PredictGameDetailsContent.types';
import PredictSportTeamGradient from '../PredictSportTeamGradient';
import PredictSportScoreboard from '../PredictSportScoreboard';
import PredictGameChart from '../PredictGameChart';
import PredictPicks from '../PredictPicks/PredictPicks';

const PredictGameDetailsContent: React.FC<PredictGameDetailsContentProps> = ({
  market,
  onBack,
  onRefresh,
  refreshing,
  onBetPress,
  onClaimPress,
  claimableAmount = 0,
  isLoading = false,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const { sheetRef, isVisible, handleSheetClosed, getRefHandlers } =
    usePredictBottomSheet();

  const sheetHandlers = useMemo(() => getRefHandlers(), [getRefHandlers]);

  const handleInfoPress = useCallback(() => {
    sheetHandlers.onOpenBottomSheet();
  }, [sheetHandlers]);

  const outcome = useMemo(() => market.outcomes[0], [market.outcomes]);
  const game = market.game;
  const tokenIds = useMemo(
    () => (outcome?.tokens ?? []).map((t) => t.id),
    [outcome?.tokens],
  );

  if (!outcome || !game) {
    return null;
  }

  return (
    <PredictSportTeamGradient
      awayColor={game.awayTeam.color}
      homeColor={game.homeTeam.color}
      style={tw.style('flex-1 bg-default')}
      testID="game-details-gradient"
    >
      <SafeAreaView style={tw.style('flex-1')} edges={['left', 'right']}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="px-4 py-3"
          style={{ paddingTop: insets.top + 12 }}
        >
          <Pressable
            onPress={onBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={strings('predict.buttons.back')}
          >
            <Icon
              name={IconName.ArrowLeft}
              size={IconSize.Lg}
              color={IconColor.IconDefault}
            />
          </Pressable>

          <Box twClassName="flex-1 mx-4">
            <Text
              variant={TextVariant.HeadingMd}
              color={TextColor.TextDefault}
              style={tw.style('text-center')}
              numberOfLines={1}
            >
              {market.title}
            </Text>
          </Box>

          <PredictShareButton marketId={market.id} />
        </Box>

        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('pb-4')}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.default}
              colors={[colors.primary.default]}
            />
          }
        >
          <Box twClassName="px-4 py-2">
            <PredictSportScoreboard game={game} testID="game-scoreboard" />
          </Box>

          {tokenIds.length === 2 && (
            <Box twClassName="mt-4">
              <PredictGameChart
                tokenIds={tokenIds as [string, string]}
                seriesConfig={[
                  {
                    label: game.awayTeam.abbreviation,
                    color: game.awayTeam.color,
                  },
                  {
                    label: game.homeTeam.abbreviation,
                    color: game.homeTeam.color,
                  },
                ]}
                testID="game-chart"
              />
            </Box>
          )}

          <Box twClassName="px-4 py-2">
            <PredictPicks market={market} testID="game-picks" />
          </Box>
        </ScrollView>

        <PredictGameDetailsFooter
          market={market}
          outcome={outcome}
          onBetPress={onBetPress}
          onClaimPress={onClaimPress}
          onInfoPress={handleInfoPress}
          claimableAmount={claimableAmount}
          isLoading={isLoading}
          awayColor={game.awayTeam.color}
          homeColor={game.homeTeam.color}
        />

        {isVisible && (
          <PredictGameAboutSheet
            ref={sheetRef}
            description={market.description ?? ''}
            onClose={handleSheetClosed}
          />
        )}
      </SafeAreaView>
    </PredictSportTeamGradient>
  );
};

export default PredictGameDetailsContent;
