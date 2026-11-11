import React from 'react';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  Skeleton,
} from '@metamask/design-system-react-native';
import { TokenDetailsInlineHeader } from '../components/TokenDetailsInlineHeader';
import { TokenDetailsActionsSkeleton } from '../components/TokenDetailsActions';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { TokenDetailsIds } from '../testIds';
import { selectTokenOverviewChartType } from '../../../../reducers/user/selectors';
import { selectTokenDetailsTechnicalIndicatorsEnabled } from '../../../../selectors/featureFlagController/tokenDetailsTechnicalIndicators';
import { ChartType } from '../../Charts/AdvancedChart/AdvancedChart.types';
import ChartCandleSkeleton from '../../Charts/ChartCandleSkeleton';
import ChartLineSkeleton from '../../Charts/ChartLineSkeleton';
import { TokenPriceTitleHub } from '../../AssetOverview/Price/TokenPriceTitleHub';
import {
  TOKEN_OVERVIEW_CHART_HEIGHT,
  TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT,
} from '../../AssetOverview/Price/tokenOverviewChart.constants';

/** Matches the IntervalBar loading bar in `Price.Chart`. */
const INTERVAL_BAR_SKELETON_HEIGHT = 29;

/**
 * Shown while `/v2/assets` is still deciding the new page versus the legacy
 * page. The header uses the route token so it is visible immediately.
 *
 * The subtitle intentionally hides the contract address and omits the live
 * price: we do not yet know whether the token resolves to the memecoin TDP
 * (which hides the address) or the legacy TDP (which shows it). Displaying
 * either one here would cause a visible flicker on the transition.
 *
 * The body mirrors the loaded price section (title, interval controls, chart,
 * actions) with the same spacing, so the swap to the real page does not shift.
 */
const TokenDetailsPagePending = ({
  token,
}: {
  token: TokenDetailsRouteParams;
}) => {
  const navigation = useNavigation();
  const chartType = useSelector(selectTokenOverviewChartType);
  const isTechnicalIndicatorsEnabled = useSelector(
    selectTokenDetailsTechnicalIndicatorsEnabled,
  );

  const chart = (
    <Box
      twClassName={`w-full ${isTechnicalIndicatorsEnabled ? 'mt-1' : 'mt-3'}`}
      style={{ height: TOKEN_OVERVIEW_CHART_HEIGHT }}
    >
      {chartType === ChartType.Candles ? (
        <ChartCandleSkeleton height={TOKEN_OVERVIEW_CHART_HEIGHT} />
      ) : (
        <ChartLineSkeleton height={TOKEN_OVERVIEW_CHART_HEIGHT} />
      )}
    </Box>
  );

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="flex-1"
      testID={TokenDetailsIds.pending}
    >
      <TokenDetailsInlineHeader
        token={token}
        securityData={null}
        onBackPress={() => navigation.goBack()}
        hideContractAddress
      />
      <TokenPriceTitleHub
        price={0}
        displayDiff={null}
        comparePrice={null}
        periodLabel={undefined}
        currentCurrency=""
        isLoading
      />
      {isTechnicalIndicatorsEnabled ? (
        <>
          <Box twClassName="w-full px-4 py-2">
            <Skeleton
              height={INTERVAL_BAR_SKELETON_HEIGHT}
              width="100%"
              twClassName="rounded-md"
            />
          </Box>
          {chart}
          <Box twClassName="pb-4" />
        </>
      ) : (
        <>
          {chart}
          <Box twClassName="w-full px-4 pt-3 pb-6">
            <Skeleton
              height={TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT}
              width="100%"
              twClassName="rounded-lg"
            />
          </Box>
        </>
      )}
      <TokenDetailsActionsSkeleton />
    </Box>
  );
};

export default TokenDetailsPagePending;
