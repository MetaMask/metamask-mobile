import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../../locales/i18n';
import Routes from '../../../../../../../constants/navigation/Routes';
import SectionHeader from '../../../../../../../component-library/components-temp/SectionHeader';
import { WalletViewSelectorsIDs } from '../../../../../Wallet/WalletView.testIds';
import { PredictEntryPointProvider } from '../../../../../../UI/Predict/contexts';
import { PredictEventValues } from '../../../../../../UI/Predict/constants/eventNames';
import { SHOW_BTC_UP_DOWN_5M_ROW } from '../../../../../../UI/Predict/constants/btcUpDown5mSeries';
import {
  PREDICT_EMPTY_STATE_CTA_NAMES,
  type PredictEmptyStateCtaName,
} from '../../../../abTestConfig';
import { PREDICT_WORLD_CUP_TAB_KEYS } from '../../../../../../UI/Predict/constants/worldCupTabs';
import {
  selectPredictHomepageDiscoveryNbaChampionEnabledFlag,
  selectPredictWorldCupScreenEnabledFlag,
} from '../../../../../../UI/Predict/selectors/featureFlags';
import {
  pickWorldCupWinnerMarket,
  resolveNbaChampionHomepageMarket,
} from '../../utils/marketResolvers';
import type { UseHomepagePredictTaggedMarketsResult } from '../../hooks/useHomepagePredictTaggedMarkets';
import type { PredictionsTrendingHeaderTestId } from '../../predictionsSectionTypes';
import type { TransactionActiveAbTestEntry } from '../../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import BtcLiveRow from './BtcLiveRow';
import ChampionshipRow, { type ChampionshipRowState } from './ChampionshipRow';
import MensWorldCupRow from './MensWorldCupRow';
import BracketPills from './BracketPills';

const WORLD_CUP_CTA_CATEGORY_NAME = 'world_cup';

export interface HomepagePredictWorldCupDiscoveryProps {
  title: string;
  onViewAll: (
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  headerTestIdKey: PredictionsTrendingHeaderTestId;
  worldCup: UseHomepagePredictTaggedMarketsResult;
  nbaChampion: UseHomepagePredictTaggedMarketsResult;
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
  nbaChampion,
  transactionActiveAbTests,
  onTreatmentCtaClick,
}) => {
  const navigation = useNavigation();
  const worldCupScreenEnabled = useSelector(
    selectPredictWorldCupScreenEnabledFlag,
  );
  const showNbaChampionDiscoveryRow = useSelector(
    selectPredictHomepageDiscoveryNbaChampionEnabledFlag,
  );
  const championshipRowKind = showNbaChampionDiscoveryRow
    ? 'nba'
    : 'world_cup_winner';
  const championshipCtaCategoryName =
    championshipRowKind === 'world_cup_winner'
      ? WORLD_CUP_CTA_CATEGORY_NAME
      : 'nba';

  /*
   * TODO: When `predict/crypto-updown-feed-card` is merged, remove
   * SHOW_BTC_UP_DOWN_5M_ROW and uncomment the shared hook wiring below.
   *
   * import { BTC_UP_OR_DOWN_5M_SERIES } from '../../../../../../UI/Predict/constants/btcUpDown5mSeries';
   * import { useCurrentCryptoUpDownMarketData } from '../../../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData';
   * import { usePredictNavigation } from '../../../../../../UI/Predict/hooks/usePredictNavigation';
   * import {
   *   selectPredictEnabledFlag,
   *   selectPredictWorldCupScreenEnabledFlag,
   * } from '../../../../../../UI/Predict/selectors/featureFlags';
   *
   * const { navigateToMarketDetails } = usePredictNavigation();
   * const isPredictEnabled = useSelector(selectPredictEnabledFlag);
   * const {
   *   marketId: btcMarketId,
   *   market: btcWindowMarket,
   *   currentPrice: btcSpotUsd,
   *   priceToBeat,
   *   countdown: btcCountdown,
   * } = useCurrentCryptoUpDownMarketData({
   *   series: BTC_UP_OR_DOWN_5M_SERIES,
   *   enabled: isPredictEnabled,
   * });
   */
  const btcSpotUsd = undefined;
  const priceToBeat = undefined;
  const btcCountdown = '--:--';

  const { marketData, isFetching, hasMore } = worldCup;
  const { marketData: nbaMarketData, isFetching: isNbaFetching } = nbaChampion;

  const isInitialLoad = isFetching && marketData.length === 0;
  const nbaLeadLoading =
    championshipRowKind === 'nba' &&
    isNbaFetching &&
    nbaMarketData.length === 0;

  const eventCountLabel = useMemo(() => {
    const n = marketData.length;
    const i18nKey =
      n > 0 && hasMore
        ? 'predict.homepage_discovery.events_in_total_overflow'
        : 'predict.homepage_discovery.events_in_total';
    return strings(i18nKey, { count: n });
  }, [marketData.length, hasMore]);

  const championshipRow: ChampionshipRowState = useMemo(() => {
    if (championshipRowKind === 'nba') {
      if (nbaLeadLoading) {
        return { kind: 'loading' };
      }
      const lead = resolveNbaChampionHomepageMarket(nbaMarketData, marketData);
      if (!lead) {
        return { kind: 'empty' };
      }
      return {
        kind: 'market',
        market: {
          ...lead,
          title: strings('predict.homepage_discovery.nba_2026_champion_title'),
        },
        detailsTitle: lead.outcomes[0]?.title ?? lead.title,
      };
    }
    if (isInitialLoad) {
      return { kind: 'loading' };
    }
    const winner = pickWorldCupWinnerMarket(marketData);
    return winner
      ? { kind: 'market', market: winner, detailsTitle: undefined }
      : { kind: 'empty' };
  }, [
    championshipRowKind,
    isInitialLoad,
    marketData,
    nbaLeadLoading,
    nbaMarketData,
  ]);

  const handleBtcRow = useCallback(() => {
    onTreatmentCtaClick?.(
      PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
      'crypto',
    );
    /*
     * TODO: When `predict/crypto-updown-feed-card` is merged, uncomment this
     * branch with the shared hook data above so the BTC row opens the live
     * market directly.
     *
     * if (btcMarketId) {
     *   navigateToMarketDetails(
     *     {
     *       marketId: btcMarketId,
     *       entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
     *       title: btcWindowMarket?.title ?? BTC_UP_OR_DOWN_5M_SERIES.title,
     *       image: btcWindowMarket?.image,
     *     },
     *     { throughRoot: true },
     *   );
     *   return;
     * }
     */
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        tab: 'crypto',
        ...(transactionActiveAbTests?.length && { transactionActiveAbTests }),
      },
    });
  }, [navigation, onTreatmentCtaClick, transactionActiveAbTests]);

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
  const handlePropsPill = useCallback(
    () => goToWorldCup(PREDICT_WORLD_CUP_TAB_KEYS.PROPS),
    [goToWorldCup],
  );
  const handleViewAll = useCallback(() => {
    onTreatmentCtaClick?.(PREDICT_EMPTY_STATE_CTA_NAMES.EXPLORE_FEATURED);
    onViewAll(transactionActiveAbTests);
  }, [onTreatmentCtaClick, onViewAll, transactionActiveAbTests]);
  const handleChampionshipRowPress = useCallback(() => {
    onTreatmentCtaClick?.(
      PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
      championshipCtaCategoryName,
    );
  }, [championshipCtaCategoryName, onTreatmentCtaClick]);

  return (
    <Box>
      <SectionHeader
        title={title}
        onPress={handleViewAll}
        testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE(headerTestIdKey)}
      />
      <PredictEntryPointProvider
        entryPoint={PredictEventValues.ENTRY_POINT.HOME_SECTION}
      >
        <Box twClassName="px-4 mt-3">
          {SHOW_BTC_UP_DOWN_5M_ROW ? (
            <BtcLiveRow
              onPress={handleBtcRow}
              btcSpotUsd={btcSpotUsd}
              priceToBeat={priceToBeat}
              countdown={btcCountdown}
            />
          ) : null}
          <ChampionshipRow
            state={championshipRow}
            onPress={handleChampionshipRowPress}
            transactionActiveAbTests={transactionActiveAbTests}
          />
          <MensWorldCupRow
            onPress={handleMensRow}
            eventCountLabel={eventCountLabel}
          />
        </Box>
        <BracketPills
          onPropsPress={handlePropsPill}
          onStagePress={goToWorldCup}
        />
      </PredictEntryPointProvider>
    </Box>
  );
};

export default HomepagePredictWorldCupDiscovery;
