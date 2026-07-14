import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../../../Wallet/WalletView.testIds';
import { PredictEntryPointProvider } from '../../../../../../UI/Predict/contexts';
import { PredictEventValues } from '../../../../../../UI/Predict/constants/eventNames';
import { BTC_UP_OR_DOWN_5M_SERIES } from '../../../../../../UI/Predict/constants/btcUpDown5mSeries';
import {
  PREDICT_EMPTY_STATE_CTA_NAMES,
  type PredictEmptyStateCtaName,
} from '../../../../abTestConfig';
import { PREDICT_WORLD_CUP_TAB_KEYS } from '../../../../../../UI/Predict/constants/worldCupTabs';
import { useCurrentCryptoUpDownMarketData } from '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData';
import { usePredictNavigation } from '../../../../../../UI/Predict/hooks/usePredictNavigation';
import {
  selectPredictEnabledFlag,
  selectPredictWorldCupScreenEnabledFlag,
} from '../../../../../../UI/Predict/selectors/featureFlags';
import {
  pickLiveWorldCupGameMarket,
  pickWorldCupWinnerMarket,
} from '../../utils/marketResolvers';
import type { UseHomepagePredictWorldCupMarketsResult } from '../../hooks/useHomepagePredictWorldCupMarkets';
import type { PredictionsTrendingHeaderTestId } from '../../predictionsSectionTypes';
import type { TransactionActiveAbTestEntry } from '../../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import BtcLiveRow from './BtcLiveRow';
import ChampionshipRow, { type ChampionshipRowState } from './ChampionshipRow';
import MensWorldCupRow from './MensWorldCupRow';
import LiveGameRow from './LiveGameRow';

const WORLD_CUP_CTA_CATEGORY_NAME = 'world_cup';

export interface HomepagePredictWorldCupDiscoveryProps {
  title: string;
  onViewAll: (
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  headerTestIdKey: PredictionsTrendingHeaderTestId;
  worldCup: UseHomepagePredictWorldCupMarketsResult;
  liveWorldCup: UseHomepagePredictWorldCupMarketsResult;
  worldCupEventCount?: number;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  onTreatmentCtaClick?: (
    ctaName: PredictEmptyStateCtaName,
    categoryName?: string,
  ) => void;
}

const HomepagePredictWorldCupDiscovery: React.FC<
  HomepagePredictWorldCupDiscoveryProps
> = ({
  title,
  onViewAll,
  headerTestIdKey,
  worldCup,
  liveWorldCup,
  worldCupEventCount,
  transactionActiveAbTests,
  onTreatmentCtaClick,
}) => {
  const navigation = useNavigation();
  const { navigateToMarketDetails } = usePredictNavigation();
  const worldCupScreenEnabled = useSelector(
    selectPredictWorldCupScreenEnabledFlag,
  );
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);
  const {
    marketId: btcMarketId,
    market: btcWindowMarket,
    currentPrice: btcSpotUsd,
    priceToBeat,
    countdown: btcCountdown,
  } = useCurrentCryptoUpDownMarketData({
    series: BTC_UP_OR_DOWN_5M_SERIES,
    enabled: isPredictEnabled,
  });
  const { marketData, isFetching } = worldCup;

  const isInitialLoad = isFetching && marketData.length === 0;
  const liveWorldCupGame = useMemo(
    () => pickLiveWorldCupGameMarket(liveWorldCup.marketData),
    [liveWorldCup.marketData],
  );

  const eventCountLabel = useMemo(
    () =>
      worldCupEventCount === undefined
        ? undefined
        : strings('predict.homepage_discovery.events_in_total_overflow', {
            count: worldCupEventCount,
          }),
    [worldCupEventCount],
  );

  const championshipRow: ChampionshipRowState = useMemo(() => {
    if (liveWorldCupGame) {
      return { kind: 'empty' };
    }
    if (isInitialLoad) {
      return { kind: 'loading' };
    }
    const winner = pickWorldCupWinnerMarket(marketData);
    return winner
      ? { kind: 'market', market: winner, detailsTitle: undefined }
      : { kind: 'loading' };
  }, [isInitialLoad, liveWorldCupGame, marketData]);

  const handleBtcRow = useCallback(() => {
    onTreatmentCtaClick?.(
      PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
      'crypto',
    );
    if (btcMarketId) {
      navigateToMarketDetails(
        {
          marketId: btcMarketId,
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          title: btcWindowMarket?.title ?? BTC_UP_OR_DOWN_5M_SERIES.title,
          image: btcWindowMarket?.image,
          ...(transactionActiveAbTests?.length && {
            transactionActiveAbTests,
          }),
        },
        { throughRoot: true },
      );
      return;
    }
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        tab: 'crypto',
        ...(transactionActiveAbTests?.length && { transactionActiveAbTests }),
      },
    });
  }, [
    btcMarketId,
    btcWindowMarket?.image,
    btcWindowMarket?.title,
    navigateToMarketDetails,
    navigation,
    onTreatmentCtaClick,
    transactionActiveAbTests,
  ]);

  const goToWorldCup = useCallback(
    (initialTab: string) => {
      onTreatmentCtaClick?.(
        PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
        WORLD_CUP_CTA_CATEGORY_NAME,
      );
      const entryPoint = PredictEventValues.ENTRY_POINT.HOME_SECTION;
      if (worldCupScreenEnabled) {
        navigation.navigate(Routes.PREDICT.ROOT, {
          screen: Routes.PREDICT.WORLD_CUP,
          params: {
            initialTab,
            entryPoint,
            ...(transactionActiveAbTests?.length && {
              transactionActiveAbTests,
            }),
          },
        });
        return;
      }
      navigation.navigate(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint,
          ...(transactionActiveAbTests?.length && {
            transactionActiveAbTests,
          }),
        },
      });
    },
    [
      navigation,
      onTreatmentCtaClick,
      transactionActiveAbTests,
      worldCupScreenEnabled,
    ],
  );
  const handleMensRow = useCallback(
    () => goToWorldCup(PREDICT_WORLD_CUP_TAB_KEYS.ALL),
    [goToWorldCup],
  );
  const handleViewAll = useCallback(() => {
    onTreatmentCtaClick?.(PREDICT_EMPTY_STATE_CTA_NAMES.EXPLORE_FEATURED);
    onViewAll(transactionActiveAbTests);
  }, [onTreatmentCtaClick, onViewAll, transactionActiveAbTests]);
  const handleChampionshipRowPress = useCallback(() => {
    onTreatmentCtaClick?.(
      PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
      WORLD_CUP_CTA_CATEGORY_NAME,
    );
  }, [onTreatmentCtaClick]);
  const handleLiveGameRowPress = useCallback(() => {
    onTreatmentCtaClick?.(
      PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
      WORLD_CUP_CTA_CATEGORY_NAME,
    );
  }, [onTreatmentCtaClick]);

  return (
    <>
      <SectionDivider />
      <SectionHeader
        title={title}
        isInteractive
        onPress={handleViewAll}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(headerTestIdKey)}
      />
      <PredictEntryPointProvider
        entryPoint={PredictEventValues.ENTRY_POINT.HOME_SECTION}
      >
        <Box twClassName="px-4">
          <BtcLiveRow
            onPress={handleBtcRow}
            btcSpotUsd={btcSpotUsd}
            priceToBeat={priceToBeat}
            countdown={btcCountdown}
          />
          {liveWorldCupGame ? (
            <LiveGameRow
              market={liveWorldCupGame}
              onPress={handleLiveGameRowPress}
              transactionActiveAbTests={transactionActiveAbTests}
            />
          ) : (
            <ChampionshipRow
              state={championshipRow}
              onPress={handleChampionshipRowPress}
              transactionActiveAbTests={transactionActiveAbTests}
            />
          )}
          <MensWorldCupRow
            onPress={handleMensRow}
            eventCountLabel={eventCountLabel}
          />
        </Box>
      </PredictEntryPointProvider>
    </>
  );
};

export default HomepagePredictWorldCupDiscovery;
