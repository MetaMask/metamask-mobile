import React, { useCallback, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../../../constants/navigation/Routes';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../../../Wallet/WalletView.testIds';
import { PredictEntryPointProvider } from '../../../../../../UI/Predict/contexts';
import { PredictEventValues } from '../../../../../../UI/Predict/constants/eventNames';
import {
  PREDICT_EMPTY_STATE_CTA_NAMES,
  type PredictEmptyStateCtaName,
} from '../../../../abTestConfig';
import { usePredictNavigation } from '../../../../../../UI/Predict/hooks/usePredictNavigation';
import {
  HOMEPAGE_PREDICT_EVENT_SLOTS,
  HOMEPAGE_PREDICT_SERIES_SLOT,
} from '../../constants/homepagePredictMarketSlots';
import type { PredictMarket } from '../../../../../../UI/Predict/types';
import type { UseHomepagePredictMarketSlotsResult } from '../../hooks/useHomepagePredictMarketSlots';
import type { PredictionsTrendingHeaderTestId } from '../../predictionsSectionTypes';
import type { TransactionActiveAbTestEntry } from '../../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import BtcLiveRow from './BtcLiveRow';
import ChampionshipRow, { type ChampionshipRowState } from './ChampionshipRow';

export interface HomepagePredictDiscoveryProps {
  title: string;
  onViewAll: (
    transactionActiveAbTests?: TransactionActiveAbTestEntry[],
  ) => void;
  headerTestIdKey: PredictionsTrendingHeaderTestId;
  marketSlots: UseHomepagePredictMarketSlotsResult;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
  onTreatmentCtaClick?: (
    ctaName: PredictEmptyStateCtaName,
    categoryName?: string,
  ) => void;
}

const HomepagePredictDiscovery: React.FC<HomepagePredictDiscoveryProps> = ({
  title,
  onViewAll,
  headerTestIdKey,
  marketSlots,
  transactionActiveAbTests,
  onTreatmentCtaClick,
}) => {
  const navigation = useNavigation();
  const { navigateToMarketDetails } = usePredictNavigation();
  const eventSlotRows = useMemo<ChampionshipRowState[]>(
    () =>
      HOMEPAGE_PREDICT_EVENT_SLOTS.map(({ id, slug }) => {
        const market = marketSlots.marketData.find(
          (candidate) => candidate.id === id && candidate.slug === slug,
        );
        if (market) {
          return { kind: 'market', market, detailsTitle: undefined };
        }
        return marketSlots.isFetching ? { kind: 'loading' } : { kind: 'empty' };
      }),
    [marketSlots.isFetching, marketSlots.marketData],
  );

  const handleBtcRow = useCallback(
    (
      btcMarketId: string | undefined,
      btcWindowMarket: PredictMarket | undefined,
    ) => {
      onTreatmentCtaClick?.(
        PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
        'crypto',
      );
      if (btcMarketId) {
        navigateToMarketDetails(
          {
            marketId: btcMarketId,
            entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
            title:
              btcWindowMarket?.title ??
              HOMEPAGE_PREDICT_SERIES_SLOT.series.title,
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
          ...(transactionActiveAbTests?.length && {
            transactionActiveAbTests,
          }),
        },
      });
    },
    [
      navigateToMarketDetails,
      navigation,
      onTreatmentCtaClick,
      transactionActiveAbTests,
    ],
  );

  const handleViewAll = useCallback(() => {
    onTreatmentCtaClick?.(PREDICT_EMPTY_STATE_CTA_NAMES.EXPLORE_FEATURED);
    onViewAll(transactionActiveAbTests);
  }, [onTreatmentCtaClick, onViewAll, transactionActiveAbTests]);
  const handleChampionshipRowPress = useCallback(() => {
    onTreatmentCtaClick?.(
      PREDICT_EMPTY_STATE_CTA_NAMES.BROWSE_CATEGORY,
      'sports',
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
          <BtcLiveRow onPress={handleBtcRow} />
          {eventSlotRows.map((state, index) => (
            <ChampionshipRow
              key={HOMEPAGE_PREDICT_EVENT_SLOTS[index].id}
              state={state}
              onPress={handleChampionshipRowPress}
              transactionActiveAbTests={transactionActiveAbTests}
              testID={`homepage-predict-discovery-market-slot-${index + 2}`}
            />
          ))}
        </Box>
      </PredictEntryPointProvider>
    </>
  );
};

export default HomepagePredictDiscovery;
