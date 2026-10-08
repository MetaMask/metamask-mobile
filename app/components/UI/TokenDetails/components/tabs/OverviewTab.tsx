import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import ContentDisplay from '../../../AssetOverview/AboutAsset/ContentDisplay';
import Balance from '../../../AssetOverview/Balance';
import TokenDetailsSection from '../../../AssetOverview/TokenDetails';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useTokenPerformance } from '../../hooks/useTokenPerformance';
import { useTokenAssetDetails } from '../../queries/tokenAssetQuery';
import { useTokenDetailsActionTracking } from '../../hooks/useTokenDetailsActionTracking';
import {
  TokenDetailsAction,
  type TokenDetailsRouteParams,
} from '../../constants/constants';
import {
  MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS,
  default as TokenDetailsMarketInsightsSection,
} from '../sections/TokenDetailsMarketInsightsSection';
import PerformanceSection from '../sections/PerformanceSection';
import ActivitySection, {
  TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID,
} from '../sections/ActivitySection';

export const OVERVIEW_TAB_TEST_ID = 'token-details-overview-tab';
export const OVERVIEW_TAB_DESCRIPTION_TEST_ID =
  'token-details-overview-tab-description';
export const OVERVIEW_TAB_BALANCE_TEST_ID =
  'token-details-overview-tab-balance';
export const OVERVIEW_TAB_TOKEN_DETAILS_TEST_ID =
  'token-details-overview-tab-token-details';
export const OVERVIEW_TAB_ACTIVITY_TEST_ID =
  TOKEN_DETAILS_ACTIVITY_SECTION_TEST_ID;

export interface OverviewTabProps {
  token: TokenDetailsRouteParams;
  assetId: CaipAssetType | null;
  currentCurrency: string;
  securityData?: TokenSecurityData | null;
}

const OverviewTab = ({
  token,
  assetId,
  currentCurrency,
  securityData,
}: OverviewTabProps) => {
  const { asset } = useTokenAssetDetails(assetId);
  const assetDescription = asset?.launchpadData?.description?.trim();
  const tokenDescription = token.description?.trim();
  // Hide the block when neither source has text. A blank string is not a description.
  const description = assetDescription || tokenDescription || undefined;

  const performance = useTokenPerformance({
    token,
    assetId,
    currentCurrency,
  });

  const { balance, fiatBalance, tokenFormattedBalance } =
    useTokenBalance(token);

  const hasBalanceValue = Boolean(balance) && balance !== '0';
  const trackActionTapped = useTokenDetailsActionTracking({
    token,
    hasBalance: hasBalanceValue,
    severity: securityData?.resultType,
  });

  return (
    <Box
      flexDirection={BoxFlexDirection.Column}
      twClassName="gap-7 pt-5 pb-6"
      testID={OVERVIEW_TAB_TEST_ID}
    >
      {description ? (
        <Box testID={OVERVIEW_TAB_DESCRIPTION_TEST_ID} twClassName="px-4">
          <ContentDisplay content={description} />
        </Box>
      ) : null}

      <Box twClassName="px-4">
        <PerformanceSection performance={performance} />
      </Box>

      {balance != null ? (
        <Box testID={OVERVIEW_TAB_BALANCE_TEST_ID}>
          <Balance
            asset={token}
            mainBalance={fiatBalance ?? ''}
            secondaryBalance={tokenFormattedBalance}
          />
        </Box>
      ) : null}

      <Box testID={OVERVIEW_TAB_TOKEN_DETAILS_TEST_ID} twClassName="px-4">
        <TokenDetailsSection
          asset={token}
          onCopyAddress={() =>
            trackActionTapped(TokenDetailsAction.CopyTokenAddress)
          }
        />
      </Box>

      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId}
        securityData={securityData ?? null}
        pricePercentChange={performance.twentyFourHour ?? 0}
        minTokenAgeDays={MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS}
      />

      <ActivitySection token={token} />
    </Box>
  );
};

OverviewTab.displayName = 'OverviewTab';

export default OverviewTab;
