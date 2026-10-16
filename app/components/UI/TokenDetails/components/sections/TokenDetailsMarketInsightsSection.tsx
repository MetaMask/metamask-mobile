import React, { useCallback, useEffect, useState } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';
import {
  MarketInsightsDisclaimerBottomSheet,
  MarketInsightsEntryCard,
  MarketInsightsEntryCardSkeleton,
  getMarketInsightsTraceId,
  getMarketInsightsTraceTags,
  selectMarketInsightsEnabled,
  useMarketInsights,
  useMarketInsightsEntryTrace,
} from '../../../MarketInsights';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { trace, TraceName, TraceOperation } from '../../../../../util/trace';
import Routes from '../../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import { useTokenCaipAssetId } from '../../hooks/useTokenCaipAssetId';

export const TOKEN_DETAILS_MARKET_INSIGHTS_SECTION_TEST_ID =
  'token-details-market-insights';

export const MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

export const isTokenUnderMinMarketInsightsAge = (
  created: string | undefined | null,
  minAgeDays: number,
): boolean => {
  if (!created) {
    return false;
  }
  const createdMs = Date.parse(created);
  if (!Number.isFinite(createdMs)) {
    return false;
  }
  return Date.now() - createdMs < minAgeDays * DAY_MS;
};

export interface TokenDetailsMarketInsightsSectionProps {
  token: TokenDetailsRouteParams;
  assetId?: CaipAssetType | null;
  securityData: TokenSecurityData | null;
  minTokenAgeDays?: number;
  onDisplayResolved?: (params: {
    isDisplayed: boolean;
    severity: string | undefined;
  }) => void;
  useAmbientColor?: boolean;
  pricePercentChange?: number;
  containerStyle?: StyleProp<ViewStyle>;
}

const TokenDetailsMarketInsightsSection = ({
  token,
  assetId,
  securityData,
  minTokenAgeDays,
  onDisplayResolved,
  useAmbientColor,
  pricePercentChange = 0,
  containerStyle,
}: TokenDetailsMarketInsightsSectionProps) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const [isDisclaimerVisible, setIsDisclaimerVisible] = useState(false);

  const isMarketInsightsEnabled = useSelector(selectMarketInsightsEnabled);

  const resolvedAssetId = useTokenCaipAssetId(token);
  const effectiveAssetId = assetId ?? resolvedAssetId;

  const isTokenTooNew =
    minTokenAgeDays !== undefined &&
    isTokenUnderMinMarketInsightsAge(securityData?.created, minTokenAgeDays);
  const isCardEnabled = isMarketInsightsEnabled && !isTokenTooNew;
  const marketInsightsCaip19Id = isCardEnabled ? effectiveAssetId : null;

  const { report, timeAgo, isLoading, error, cacheState } = useMarketInsights(
    marketInsightsCaip19Id,
    isCardEnabled,
    {
      source: 'token_details',
      stage: 'entry_card',
      assetType: 'token',
    },
  );

  const marketInsightsEntryTraceId = useMarketInsightsEntryTrace({
    assetIdentifier: marketInsightsCaip19Id,
    assetType: 'token',
    cacheState,
    enabled: isCardEnabled,
    error,
    isLoading,
    report,
    source: 'token_details',
  });

  useEffect(() => {
    const severity = securityData?.resultType;
    if (!isCardEnabled) {
      onDisplayResolved?.({ isDisplayed: false, severity });
      return;
    }
    if (isLoading) {
      return;
    }
    onDisplayResolved?.({ isDisplayed: Boolean(report), severity });
  }, [
    onDisplayResolved,
    isCardEnabled,
    isLoading,
    report,
    securityData?.resultType,
  ]);

  const handleCardPress = useCallback(() => {
    if (!marketInsightsCaip19Id) {
      return;
    }

    const traceId = getMarketInsightsTraceId(
      marketInsightsCaip19Id,
      'token_details',
      'full_view',
    );
    trace({
      name: TraceName.MarketInsightsViewLoad,
      op: TraceOperation.MarketInsightsLoad,
      id: traceId,
      tags: getMarketInsightsTraceTags(
        {
          source: 'token_details',
          stage: 'full_view',
          assetType: 'token',
        },
        'warm',
      ),
    });
    trackEvent(
      createEventBuilder(MetaMetricsEvents.MARKET_INSIGHTS_OPENED)
        .addProperties({
          caip19: marketInsightsCaip19Id,
          source: 'token_details',
          ...(report && {
            asset_symbol: report.asset,
            digest_id: report.digestId,
          }),
        })
        .build(),
    );

    navigation.navigate(Routes.MARKET_INSIGHTS.VIEW, {
      assetSymbol: token.symbol,
      assetIdentifier: marketInsightsCaip19Id as string,
      tokenImageUrl: token.image || token.logo,
      pricePercentChange,
      token,
      source: 'token_details',
      useAmbientColor,
    });
  }, [
    createEventBuilder,
    marketInsightsCaip19Id,
    navigation,
    pricePercentChange,
    report,
    token,
    trackEvent,
    useAmbientColor,
  ]);

  const shouldShowCard =
    isCardEnabled &&
    Boolean(marketInsightsCaip19Id) &&
    (Boolean(report) || isLoading);

  if (!shouldShowCard) {
    return null;
  }

  return (
    <View
      testID={TOKEN_DETAILS_MARKET_INSIGHTS_SECTION_TEST_ID}
      style={containerStyle}
    >
      {report ? (
        <MarketInsightsEntryCard
          report={report}
          timeAgo={timeAgo}
          onPress={handleCardPress}
          onDisclaimerPress={() => setIsDisclaimerVisible(true)}
          caip19Id={marketInsightsCaip19Id ?? undefined}
          traceId={marketInsightsEntryTraceId}
          source="token_details"
          testID="market-insights-entry-card"
        />
      ) : (
        <MarketInsightsEntryCardSkeleton />
      )}
      {isDisclaimerVisible && (
        <MarketInsightsDisclaimerBottomSheet
          onClose={() => setIsDisclaimerVisible(false)}
        />
      )}
    </View>
  );
};

TokenDetailsMarketInsightsSection.displayName =
  'TokenDetailsMarketInsightsSection';

export default TokenDetailsMarketInsightsSection;
