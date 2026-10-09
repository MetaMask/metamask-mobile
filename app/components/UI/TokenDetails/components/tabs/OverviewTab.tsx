import React from 'react';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import type { CaipAssetType } from '@metamask/utils';
import ContentDisplay from '../../../AssetOverview/AboutAsset/ContentDisplay';
import Balance from '../../../AssetOverview/Balance';
import TokenDetailsSection from '../../../AssetOverview/TokenDetails';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import { useTokenBalance } from '../../hooks/useTokenBalance';
import { useTokenPerformance } from '../../hooks/useTokenPerformance';
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

/**
 * TODO(ASSETS-4020): replace with the token's real description once the API
 * platform exposes it. Delete the `?? MOCK_TOKEN_DESCRIPTION` fallback in
 * the component to restore the pure hide-when-absent gate, or set this to
 * `undefined` to preview the hidden state in the simulator.
 */
const MOCK_TOKEN_DESCRIPTION: string | undefined =
  'Pepe is a deflationary memecoin launched on Ethereum in 2023 as a tribute to the Pepe the Frog internet character. There is no formal team or roadmap — the token is entirely community-driven.';

export interface OverviewTabProps {
  token: TokenDetailsRouteParams;
  assetId: CaipAssetType | null;
  currentCurrency: string;
  securityData?: TokenSecurityData | null;
  /**
   * Market data already resolved by the screen, forwarded to the details list
   * so it does not fetch the same figures a second time.
   */
  marketData?: FungibleAssetPrice | null;
}

const OverviewTab = ({
  token,
  assetId,
  currentCurrency,
  securityData,
  marketData,
}: OverviewTabProps) => {
  const description = token.description ?? MOCK_TOKEN_DESCRIPTION;

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
          marketData={marketData}
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
