import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
  SectionHeader,
} from '@metamask/design-system-react-native';
import PredictMarket from '../../../../components/PredictMarket';
import PredictMarketSkeleton from '../../../../components/PredictMarketSkeleton';
import { PredictEventValues } from '../../../../constants/eventNames';
import {
  V2_TEST_DISPLAY_LIMIT,
  usePredictV2TestSection,
} from './usePredictV2TestSection';

/**
 * TEMPORARY (Protocol V2 testing): Predict home section listing Gamma's
 * `version=v2` markets through the regular `listMarkets` pipeline (same
 * cards, parser, and version routing as Trending), filtered down to events
 * with CLOB book depth. Mounted next to the Trending section for manual
 * testing; delete at PRED-1353.
 */
const PredictV2TestSection: React.FC = () => {
  const { markets, isLoading, showEmptyState, diagnostics } =
    usePredictV2TestSection();

  return (
    <Box testID="predict-home-v2-test-section">
      <SectionHeader
        testID="predict-home-v2-test-header"
        title="Protocol V2 markets"
        twClassName="px-0 pt-0 mb-1"
      />
      <Text
        variant={TextVariant.BodyXs}
        color={TextColor.TextAlternative}
        twClassName="mb-2"
      >
        {`fetched ${diagnostics.fetched} · non-updown ${diagnostics.candidates} · liquid tokens ${diagnostics.liquidTokens} · kept ${diagnostics.kept}`}
        {diagnostics.best5m ? ` · 5m: ${diagnostics.best5m}` : ''}
        {diagnostics.filterError
          ? ` · filter error: ${diagnostics.filterError}`
          : ''}
        {diagnostics.listError ? ` · list error: ${diagnostics.listError}` : ''}
      </Text>

      {isLoading ? (
        <Box>
          {Array.from({ length: V2_TEST_DISPLAY_LIMIT }).map((_, index) => (
            <PredictMarketSkeleton
              key={`predict-home-v2-test-skeleton-${index}`}
              testID={`predict-home-v2-test-skeleton-${index}`}
            />
          ))}
        </Box>
      ) : showEmptyState ? (
        <Box
          testID="predict-home-v2-test-error-state"
          twClassName="items-center justify-center rounded-xl bg-muted py-8 px-4"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="text-center"
          >
            No Protocol V2 markets to load
          </Text>
        </Box>
      ) : (
        <Box>
          {markets.map((market) => (
            <PredictMarket
              key={market.id}
              market={market}
              entryPoint={PredictEventValues.ENTRY_POINT.HOME_SECTION}
              testID={`predict-home-v2-test-card-${market.id}`}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PredictV2TestSection;
