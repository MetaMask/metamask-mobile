import React, { useCallback } from 'react';
import { ScrollView, View, Linking, TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
  ButtonBase,
} from '@metamask/design-system-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';
import { useNetworkName } from '../../../Views/confirmations/hooks/useNetworkName';
import type { TokenDetailsRouteParams } from '../../TokenDetails/constants/constants';
import { RiskLevel } from '../types';
import {
  getRiskLevel,
  formatFeePercent,
  getTop10HoldingPct,
  getTotalLiquidityUSD,
  formatCompactUSD,
  formatCompactSupply,
  getWhaleConcentrationRisk,
  hasFeature,
  getSmartContractRisk,
} from '../utils/securityUtils';

const Divider: React.FC = () => (
  <Box twClassName="py-5 self-stretch">
    <Box twClassName="h-px bg-border-muted" />
  </Box>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text
    variant={TextVariant.HeadingMd}
    color={TextColor.TextDefault}
    twClassName="px-4 pt-6 pb-3"
  >
    {title}
  </Text>
);

const RISK_BADGE: Record<
  RiskLevel,
  { label: string; bg: string; text: TextColor }
> = {
  [RiskLevel.Low]: {
    label: strings('security_trust.risk_low'),
    bg: 'bg-success-muted',
    text: TextColor.SuccessDefault,
  },
  [RiskLevel.Medium]: {
    label: strings('security_trust.risk_medium'),
    bg: 'bg-warning-muted',
    text: TextColor.WarningDefault,
  },
  [RiskLevel.High]: {
    label: strings('security_trust.risk_high'),
    bg: 'bg-error-muted',
    text: TextColor.ErrorDefault,
  },
  [RiskLevel.Unknown]: {
    label: strings('security_trust.na'),
    bg: 'bg-muted',
    text: TextColor.TextAlternative,
  },
};

const RiskBadge: React.FC<{ level: RiskLevel }> = ({ level }) => {
  const cfg = RISK_BADGE[level];
  return (
    <Box
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Center}
      twClassName={`rounded self-start min-w-[22px] px-1.5 ${cfg.bg}`}
    >
      <Text
        variant={TextVariant.BodySm}
        color={cfg.text}
        fontWeight={FontWeight.Medium}
      >
        {cfg.label}
      </Text>
    </Box>
  );
};

const CheckRow: React.FC<{
  label: string;
  description?: string;
  isPositive: boolean;
}> = ({ label, description, isPositive }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    gap={3}
    twClassName="py-1 flex-1"
  >
    <Icon
      name={isPositive ? IconName.SecurityTick : IconName.SecurityCross}
      size={IconSize.Md}
      color={isPositive ? IconColor.SuccessDefault : IconColor.ErrorDefault}
    />
    <Box twClassName="flex-1">
      <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
        {label}
      </Text>
      {description ? (
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {description}
        </Text>
      ) : null}
    </Box>
  </Box>
);

const RiskFactorRow: React.FC<{
  title: string;
  description: string;
  level: RiskLevel;
}> = ({ title, description, level }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    justifyContent={BoxJustifyContent.Between}
    twClassName="px-4 py-3"
  >
    <Box twClassName="flex-1 mr-3">
      <Text
        variant={TextVariant.BodyMd}
        color={TextColor.TextDefault}
        fontWeight={FontWeight.Medium}
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mt-0.5"
      >
        {description}
      </Text>
    </Box>
    <RiskBadge level={level} />
  </Box>
);

const SecurityTrustScreen: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const params = route.params as TokenDetailsRouteParams;
  const securityData = params?.securityData ?? null;

  const riskLevel = getRiskLevel(securityData?.resultType);
  const fees = securityData?.fees ?? null;
  const features = securityData?.features ?? [];
  const financialStats = securityData?.financialStats ?? null;
  const metadata = securityData?.metadata ?? null;

  const top10Pct = getTop10HoldingPct(financialStats);
  const otherPct = top10Pct !== null ? Math.max(0, 100 - top10Pct) : null;
  const barFillStyle = React.useMemo(
    () => ({ width: `${top10Pct ?? 0}%` as `${number}%` }),
    [top10Pct],
  );
  const totalLiquidity = getTotalLiquidityUSD(financialStats);

  const formattedCreatedDate = React.useMemo(() => {
    const raw = securityData?.created;
    if (!raw) return strings('security_trust.na');
    try {
      return new Date(raw).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return raw;
    }
  }, [securityData?.created]);

  const tokenAgeDisplay = React.useMemo(() => {
    const raw = securityData?.created;
    if (!raw) return strings('security_trust.na');
    try {
      const diffMs = Date.now() - new Date(raw).getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (days < 30) return `${days}d`;
      if (days < 365) return `${Math.floor(days / 30)}mo`;
      return `${Math.floor(days / 365)}yr`;
    } catch {
      return strings('security_trust.na');
    }
  }, [securityData?.created]);

  const tokenType = params?.isNative ? 'Native' : 'ERC-20';
  const networkName = useNetworkName(params?.chainId as Hex);

  const openLink = useCallback((url: string) => {
    Linking.openURL(url).catch(() => null);
  }, []);

  const scrollContentStyle = React.useMemo(
    () => ({ paddingTop: 16, paddingBottom: insets.bottom + 24 }),
    [insets.bottom],
  );

  const RESULT_CONFIG: Record<
    string,
    { heading: string; headingColor: TextColor; subtitle: string }
  > = {
    Verified: {
      heading: strings('security_trust.no_risks_detected'),
      headingColor: TextColor.SuccessDefault,
      subtitle: strings('security_trust.subtitle_verified', {
        name: params?.name ?? 'This token',
      }),
    },
    Benign: {
      heading: strings('security_trust.no_risks_detected'),
      headingColor: TextColor.SuccessDefault,
      subtitle: strings('security_trust.subtitle_benign'),
    },
    Warning: {
      heading: strings('security_trust.warning'),
      headingColor: TextColor.WarningDefault,
      subtitle: strings('security_trust.subtitle_warning'),
    },
    Spam: {
      heading: strings('security_trust.spam'),
      headingColor: TextColor.WarningDefault,
      subtitle: strings('security_trust.subtitle_warning'),
    },
    Malicious: {
      heading: strings('security_trust.malicious'),
      headingColor: TextColor.ErrorDefault,
      subtitle: strings('security_trust.subtitle_malicious'),
    },
  };

  const resultConfig = RESULT_CONFIG[securityData?.resultType ?? ''] ?? {
    heading: strings('security_trust.data_unavailable'),
    headingColor: TextColor.TextAlternative,
    subtitle: strings('security_trust.subtitle_unavailable'),
  };

  const whaleConcentrationLevel = getWhaleConcentrationRisk(top10Pct);
  const whaleDescription =
    top10Pct !== null
      ? strings('security_trust.whale_description', {
          percent: top10Pct.toFixed(0),
        })
      : strings('security_trust.whale_description_unavailable');

  return (
    <View style={tw.style('flex-1 bg-default')} testID="security-trust-screen">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Md}
            color={IconColor.IconDefault}
          />
        </TouchableOpacity>

        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          twClassName="flex-1 text-center"
        >
          {strings('security_trust.title')}
        </Text>

        <View style={tw.style('w-5')} />
      </Box>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContentStyle}
      >
        {/* ══ Section 1: Security Score header ════════════════════════════════ */}
        <Box twClassName="px-4 py-4" gap={3}>
          <Text variant={TextVariant.HeadingMd} color={TextColor.TextDefault}>
            {params?.name
              ? strings('security_trust.security_analysis', {
                  name: params.name,
                })
              : strings('security_trust.security_analysis_default')}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {resultConfig.subtitle}
          </Text>
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName={`rounded self-start px-2 py-0.5 ${
              riskLevel === RiskLevel.Low
                ? 'bg-success-muted'
                : riskLevel === RiskLevel.Medium
                  ? 'bg-warning-muted'
                  : riskLevel === RiskLevel.High
                    ? 'bg-error-muted'
                    : 'bg-muted'
            }`}
          >
            <Text
              variant={TextVariant.BodySm}
              color={resultConfig.headingColor}
              fontWeight={FontWeight.Medium}
            >
              {resultConfig.heading}
            </Text>
          </Box>
        </Box>

        <Divider />

        {/* ══ Section 2: Risk Factors ══════════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.risk_factors')} />
        <RiskFactorRow
          title={strings('security_trust.whale_concentration')}
          description={whaleDescription}
          level={whaleConcentrationLevel}
        />
        <RiskFactorRow
          title={strings('security_trust.staking_centralization')}
          description={strings('security_trust.na')}
          level={RiskLevel.Unknown}
        />
        <RiskFactorRow
          title={strings('security_trust.smart_contract_risk')}
          description={
            riskLevel === RiskLevel.Low
              ? totalLiquidity
                ? strings('security_trust.smart_contract_low_risk', {
                    tvl: formatCompactUSD(totalLiquidity),
                  })
                : strings('security_trust.smart_contract_low_risk_no_tvl')
              : strings('security_trust.smart_contract_review')
          }
          level={getSmartContractRisk(securityData?.resultType)}
        />

        {/* ══ Section 3: Token Distribution ═══════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.token_distribution')} />

        <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 pb-3 gap-6">
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('security_trust.total_supply')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
              twClassName="mt-0.5"
            >
              {formatCompactSupply(financialStats?.supply, params?.decimals)}{' '}
              {params?.symbol ?? ''}
            </Text>
          </Box>
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('security_trust.circulating_supply')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mt-0.5"
            >
              {strings('security_trust.na')}
            </Text>
          </Box>
        </Box>

        {top10Pct !== null && (
          <Box twClassName="px-4 pb-4">
            <Box twClassName="h-2 rounded-full overflow-hidden flex-row bg-[rgba(133,139,154,0.3)]">
              <Box twClassName="h-full bg-[#6B7FFF]" style={barFillStyle} />
            </Box>
          </Box>
        )}

        <Box twClassName="px-4 py-1 gap-y-3">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
              twClassName="flex-1"
            >
              <Box twClassName="w-2 h-2 rounded-full bg-[#6B7FFF]" />
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('security_trust.top_10_holders')}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              color={
                top10Pct !== null
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
              fontWeight={FontWeight.Medium}
            >
              {top10Pct !== null
                ? `${top10Pct.toFixed(1)}%`
                : strings('security_trust.na')}
            </Text>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
              twClassName="flex-1"
            >
              <Box twClassName="w-2 h-2 rounded-full bg-[#C17BFF]" />
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('security_trust.top_100_holders')}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Medium}
            >
              {strings('security_trust.na')}
            </Text>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
              twClassName="flex-1"
            >
              <Box twClassName="w-2 h-2 rounded-full bg-[rgba(133,139,154,0.5)]" />
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {strings('security_trust.other')}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              color={
                otherPct !== null
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
              fontWeight={FontWeight.Medium}
            >
              {otherPct !== null
                ? `${otherPct.toFixed(1)}%`
                : strings('security_trust.na')}
            </Text>
          </Box>
        </Box>

        {/* ══ Section 4: Contract Security ════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.contract_security')} />
        <Box twClassName="px-4 w-full" gap={3}>
          <CheckRow
            label={strings('security_trust.source_code_verified')}
            description={strings('security_trust.source_code_verified')}
            isPositive={hasFeature(features, 'VERIFIED_CONTRACT')}
          />
          <CheckRow
            label={strings('security_trust.no_mint_function')}
            description={strings('security_trust.no_mint_description')}
            isPositive={!hasFeature(features, 'IS_MINTABLE')}
          />
          <CheckRow
            label={strings('security_trust.no_blacklist')}
            description={strings('security_trust.no_blacklist_description')}
            isPositive={!hasFeature(features, 'CAN_BLACKLIST')}
          />
        </Box>

        {/* ══ Section 5: Honeypot Analysis ════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.honeypot_analysis')} />
        <Box twClassName="px-4 w-full" gap={3}>
          <CheckRow
            label={strings('security_trust.buy_sell_enabled')}
            description={strings('security_trust.buy_sell_description')}
            isPositive={
              !hasFeature(features, 'HONEYPOT') &&
              !hasFeature(features, 'RUGPULL') &&
              !hasFeature(features, 'TRANSFER_PAUSEABLE')
            }
          />
          <CheckRow
            label={strings('security_trust.no_hidden_fees')}
            description={strings('security_trust.no_hidden_fees_description')}
            isPositive={
              fees !== null &&
              fees.transfer === 0 &&
              fees.buy === 0 &&
              fees.sell === 0
            }
          />
          <CheckRow
            label={strings('security_trust.slippage_normal')}
            description={strings('security_trust.na')}
            isPositive={false}
          />
        </Box>

        {/* ══ Section 6: Liquidity ═════════════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.liquidity')} />
        <Box twClassName="px-4 w-full" gap={3}>
          <CheckRow
            label={strings('security_trust.liquidity_locked')}
            description={
              financialStats?.lockedLiquidityPct != null
                ? strings('security_trust.liquidity_locked_description', {
                    percent: financialStats.lockedLiquidityPct.toFixed(0),
                  })
                : strings('security_trust.liquidity_lock_unavailable')
            }
            isPositive={(financialStats?.lockedLiquidityPct ?? 0) > 0}
          />
          {totalLiquidity !== null && (
            <CheckRow
              label={strings('security_trust.deep_liquidity')}
              description={strings(
                'security_trust.deep_liquidity_description',
                {
                  amount: formatCompactUSD(totalLiquidity),
                },
              )}
              isPositive={totalLiquidity > 100_000}
            />
          )}
          {financialStats?.markets && financialStats.markets.length > 1 && (
            <CheckRow
              label={strings('security_trust.multiple_dexs')}
              description={strings('security_trust.multiple_dexs_description', {
                dexes: financialStats.markets
                  .map((m) => m.marketName)
                  .filter(Boolean)
                  .join(', '),
              })}
              isPositive
            />
          )}
        </Box>

        {/* ══ Section 7: Audits & Reviews ══════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.audits_reviews')} />
        <Box twClassName="px-4 w-full" gap={3}>
          {(
            ['Trail of bits', 'OpenZeppelin', 'Consensys Diligence'] as const
          ).map((auditor) => (
            <CheckRow
              key={auditor}
              label={auditor}
              description={strings('security_trust.na')}
              isPositive={false}
            />
          ))}
        </Box>

        {/* ══ Section 8: Buy/Sell Tax ══════════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.buy_sell_tax')} />
        <Box twClassName="px-4 w-full" gap={3}>
          <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full">
            {(
              [
                { label: strings('security_trust.buy_tax'), value: fees?.buy },
                {
                  label: strings('security_trust.sell_tax'),
                  value: fees?.sell,
                },
                {
                  label: strings('security_trust.transfer'),
                  value: fees?.transfer,
                },
              ] as const
            ).map(({ label, value }) => (
              <Box
                key={label}
                twClassName="flex-1 py-1"
                gap={3}
                alignItems={BoxAlignItems.Start}
              >
                <Text
                  variant={TextVariant.HeadingMd}
                  color={TextColor.SuccessDefault}
                  fontWeight={FontWeight.Bold}
                >
                  {formatFeePercent(value)}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  fontWeight={FontWeight.Medium}
                >
                  {label}
                </Text>
              </Box>
            ))}
          </Box>
          {fees !== null &&
            fees.transfer === 0 &&
            fees.buy === 0 &&
            fees.sell === 0 && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                gap={1}
                twClassName="bg-success-muted rounded px-1.5 min-w-[22px] self-start"
              >
                <Icon
                  name={IconName.SecurityTick}
                  size={IconSize.Sm}
                  color={IconColor.SuccessDefault}
                />
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.SuccessDefault}
                  fontWeight={FontWeight.Medium}
                >
                  {strings('security_trust.no_hidden_fees_detected')}
                </Text>
              </Box>
            )}
        </Box>

        {/* ══ Section 9: Token Info ════════════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.token_info')} />
        <Box twClassName="px-4 w-full" gap={2}>
          <Box flexDirection={BoxFlexDirection.Row} gap={3}>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.created')}
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {formattedCreatedDate}
              </Text>
            </Box>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.token_age')}
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {tokenAgeDisplay}
              </Text>
            </Box>
          </Box>
          <Box flexDirection={BoxFlexDirection.Row} gap={3}>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.network')}
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {networkName ?? strings('security_trust.na')}
              </Text>
            </Box>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.type')}
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {tokenType}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* ══ Section 10: On-chain Activity ════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.on_chain_activity')} />
        <Box twClassName="px-4 w-full" gap={2}>
          <Box flexDirection={BoxFlexDirection.Row} gap={3}>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.transactions_24h')}
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('security_trust.na')}
              </Text>
            </Box>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.active_wallets_24h')}
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('security_trust.na')}
              </Text>
            </Box>
          </Box>
          <Box flexDirection={BoxFlexDirection.Row} gap={3}>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.avg_tx_value')}
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('security_trust.na')}
              </Text>
            </Box>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                {strings('security_trust.gas_avg')}
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('security_trust.na')}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* ══ Section 11: Official Links ═══════════════════════════════════════ */}
        {metadata?.externalLinks && (
          <>
            <SectionHeader title={strings('security_trust.official_links')} />
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={3}
              twClassName="px-4 w-full py-1 flex-wrap content-center"
            >
              {metadata.externalLinks.homepage && (
                <ButtonBase
                  onPress={() =>
                    openLink(metadata.externalLinks.homepage || '')
                  }
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 h-8 ${pressed ? 'opacity-70' : ''}`
                  }
                  startIconName={IconName.Global}
                  startIconProps={{
                    color: IconColor.IconDefault,
                    size: IconSize.Sm,
                  }}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextDefault}
                  >
                    {strings('security_trust.website')}
                  </Text>
                </ButtonBase>
              )}
              {metadata.externalLinks.twitterPage && (
                <ButtonBase
                  onPress={() =>
                    openLink(
                      `https://x.com/${metadata.externalLinks.twitterPage}`,
                    )
                  }
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 h-8 ${pressed ? 'opacity-70' : ''}`
                  }
                  startIconName={IconName.X}
                  startIconProps={{
                    color: IconColor.IconDefault,
                    size: IconSize.Sm,
                  }}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextDefault}
                  >
                    {strings('security_trust.twitter_x')}
                  </Text>
                </ButtonBase>
              )}
              {metadata.externalLinks.telegramChannelId && (
                <ButtonBase
                  onPress={() =>
                    openLink(
                      `https://t.me/${metadata.externalLinks.telegramChannelId}`,
                    )
                  }
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 h-8 ${pressed ? 'opacity-70' : ''}`
                  }
                  startIconName={IconName.Global}
                  startIconProps={{
                    color: IconColor.IconDefault,
                    size: IconSize.Sm,
                  }}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextDefault}
                  >
                    {strings('security_trust.telegram')}
                  </Text>
                </ButtonBase>
              )}
              {params?.address && !params.isNative && (
                <ButtonBase
                  onPress={() =>
                    openLink(`https://etherscan.io/address/${params.address}`)
                  }
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 h-8 ${pressed ? 'opacity-70' : ''}`
                  }
                  startIconName={IconName.Global}
                  startIconProps={{
                    color: IconColor.IconDefault,
                    size: IconSize.Sm,
                  }}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextDefault}
                  >
                    {strings('security_trust.etherscan')}
                  </Text>
                </ButtonBase>
              )}
            </Box>
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default SecurityTrustScreen;
