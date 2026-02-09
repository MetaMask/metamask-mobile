import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import { usePredictBottomSheet } from '../../hooks/usePredictBottomSheet';
import PredictGameChart from '../PredictGameChart';
import { PredictGameDetailsFooter } from '../PredictGameDetailsFooter';
import PredictGameAboutSheet from '../PredictGameDetailsFooter/PredictGameAboutSheet';
import PredictPicks from '../PredictPicks/PredictPicks';
import PredictShareButton from '../PredictShareButton/PredictShareButton';
import PredictSportScoreboard from '../PredictSportScoreboard';
import { PredictGameDetailsContentProps } from './PredictGameDetailsContent.types';
import { useTheme } from '../../../../../util/theme';
import { PredictMarketDetailsSelectorsIDs } from '../../Predict.testIds';

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

  if (!outcome || !game) {
    return null;
  }

  return (
    <SafeAreaView
      testID={PredictMarketDetailsSelectorsIDs.SCREEN}
      style={tw.style('flex-1')}
      edges={['left', 'right']}
    >
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

        <PredictShareButton marketId={market.id} marketSlug={market.slug} />
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

        <Box twClassName="mt-4">
          <PredictGameChart market={market} testID="game-chart" />
        </Box>

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
      />

      {isVisible && (
        <PredictGameAboutSheet
          ref={sheetRef}
          description={market.description ?? ''}
          onClose={handleSheetClosed}
        />
      )}
    </SafeAreaView>
  );
};

export default PredictGameDetailsContent;
