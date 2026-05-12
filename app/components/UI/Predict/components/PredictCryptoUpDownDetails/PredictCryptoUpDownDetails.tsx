import React from 'react';
import { Image, RefreshControl } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, IconName } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderStandardAnimated from '../../../../../component-library/components-temp/HeaderStandardAnimated';
import useHeaderStandardAnimated from '../../../../../component-library/components-temp/HeaderStandardAnimated/useHeaderStandardAnimated';
import TitleSubpage from '../../../../../component-library/components-temp/TitleSubpage';
import type { PredictMarket, PredictSeries } from '../../types';
import { formatMarketEndDate } from '../../utils/format';
import usePredictShare from '../../hooks/usePredictShare';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../Predict.testIds';

export interface PredictCryptoUpDownDetailsProps {
  market: PredictMarket & { series: PredictSeries };
  onBack: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const PredictCryptoUpDownDetails: React.FC<PredictCryptoUpDownDetailsProps> = ({
  market,
  onBack,
  onRefresh,
  refreshing,
}) => {
  const tw = useTailwind();
  const { scrollY, titleSectionHeightSv, setTitleSectionHeight, onScroll } =
    useHeaderStandardAnimated();
  const { handleSharePress } = usePredictShare({
    marketId: market.id,
    marketSlug: market.slug,
  });

  const title = market.series.title;
  const subtitle = market.endDate
    ? formatMarketEndDate(market.endDate)
    : undefined;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'top']}
      testID={PredictCryptoUpDownDetailsSelectorsIDs.SCREEN}
    >
      <HeaderStandardAnimated
        scrollY={scrollY}
        titleSectionHeight={titleSectionHeightSv}
        title={title}
        subtitle={subtitle}
        onBack={onBack}
        backButtonProps={{
          testID: PredictCryptoUpDownDetailsSelectorsIDs.BACK_BUTTON,
        }}
        endButtonIconProps={[
          {
            iconName: IconName.Share,
            onPress: handleSharePress,
            testID: PredictCryptoUpDownDetailsSelectorsIDs.SHARE_BUTTON,
          },
        ]}
        testID={PredictCryptoUpDownDetailsSelectorsIDs.HEADER}
      />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        testID={PredictCryptoUpDownDetailsSelectorsIDs.SCROLL_VIEW}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Box
          testID={PredictCryptoUpDownDetailsSelectorsIDs.TITLE_SECTION}
          onLayout={(e) => setTitleSectionHeight(e.nativeEvent.layout.height)}
        >
          <TitleSubpage
            startAccessory={
              <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                {market.image ? (
                  <Image
                    source={{ uri: market.image }}
                    style={tw.style('w-full h-full')}
                    resizeMode="cover"
                  />
                ) : (
                  <Box twClassName="w-full h-full bg-muted" />
                )}
              </Box>
            }
            title={title}
            bottomLabel={subtitle}
            twClassName="px-4 pt-1 pb-3"
          />
        </Box>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default PredictCryptoUpDownDetails;
