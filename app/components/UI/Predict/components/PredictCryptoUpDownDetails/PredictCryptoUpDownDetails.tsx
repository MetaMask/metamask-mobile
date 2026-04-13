import React, { useEffect, useState } from 'react';
import { Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Box, IconName } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import TitleSubpage from '../../../../../component-library/components-temp/TitleSubpage';
import type { PredictMarket, PredictSeries } from '../../types';
import { formatMarketEndDate } from '../../utils/format';
import usePredictShare from '../../hooks/usePredictShare';
import { PredictCryptoUpDownDetailsSelectorsIDs } from '../../Predict.testIds';
import { usePredictSeries } from '../../hooks/usePredictSeries';
import { RECURRENCE_TO_DURATION_SECS } from '../../utils/cryptoUpDown';
import { TimeSlotPicker } from '../TimeSlotPicker';
import { findLiveMarket } from '../TimeSlotPicker/TimeSlotPicker.utils';
import PredictCryptoUpDownChart from '../PredictCryptoUpDownChart';

export interface PredictCryptoUpDownDetailsProps {
  market: PredictMarket & { series: PredictSeries };
  onBack: () => void;
}

const PredictCryptoUpDownDetails: React.FC<PredictCryptoUpDownDetailsProps> = ({
  market,
  onBack,
}) => {
  const tw = useTailwind();
  const [selectedMarket, setSelectedMarket] = useState<
    PredictMarket & { series: PredictSeries }
  >(market);

  const { handleSharePress } = usePredictShare({
    marketId: selectedMarket.id,
    marketSlug: selectedMarket.slug,
  });

  const recurrence = market.series.recurrence;
  const durationMs = (RECURRENCE_TO_DURATION_SECS[recurrence] ?? 5 * 60) * 1000;
  const endDateMs = market.endDate
    ? new Date(market.endDate).getTime()
    : Date.now();
  const endDateMin = new Date(endDateMs - 3 * durationMs).toISOString();
  const endDateMax = new Date(endDateMs + 10 * durationMs).toISOString();

  const { data: seriesMarkets } = usePredictSeries({
    seriesId: market.series.id,
    endDateMin,
    endDateMax,
  });

  // Once the series markets load, auto-advance to the live slot if the current
  // selectedMarket has a known endDate that has already passed
  // (e.g. user tapped an expired card in the market list).
  useEffect(() => {
    if (!seriesMarkets?.length) return;
    const hasEnded =
      selectedMarket.endDate &&
      Date.now() >= new Date(selectedMarket.endDate).getTime();
    if (!hasEnded) return;
    const liveMarket = findLiveMarket(seriesMarkets);
    if (liveMarket) {
      setSelectedMarket(
        liveMarket as PredictMarket & { series: PredictSeries },
      );
    }
  }, [seriesMarkets]); // eslint-disable-line react-hooks/exhaustive-deps

  const title = selectedMarket.series.title;
  const subtitle = selectedMarket.endDate
    ? formatMarketEndDate(selectedMarket.endDate)
    : undefined;

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'top']}
      testID={PredictCryptoUpDownDetailsSelectorsIDs.SCREEN}
    >
      <HeaderCompactStandard
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

      <Box testID={PredictCryptoUpDownDetailsSelectorsIDs.TITLE_SECTION}>
        <TitleSubpage
          startAccessory={
            <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
              {selectedMarket.image ? (
                <Image
                  source={{ uri: selectedMarket.image }}
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

      <TimeSlotPicker
        markets={seriesMarkets ?? []}
        selectedMarketId={selectedMarket.id}
        onMarketSelected={(m) =>
          setSelectedMarket(m as PredictMarket & { series: PredictSeries })
        }
      />

      <Box twClassName="flex-1">
        <PredictCryptoUpDownChart market={selectedMarket} />
      </Box>
    </SafeAreaView>
  );
};

export default PredictCryptoUpDownDetails;
