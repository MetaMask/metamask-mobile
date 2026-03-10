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

// ─── Shared primitives ────────────────────────────────────────────────────────

/** Full-width horizontal divider between major sections */
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

// ─── Risk badge ───────────────────────────────────────────────────────────────

const RISK_BADGE: Record<
  RiskLevel,
  { label: string; bg: string; text: TextColor }
> = {
  [RiskLevel.Low]: {
    label: 'Low',
    bg: 'bg-success-muted',
    text: TextColor.SuccessDefault,
  },
  [RiskLevel.Medium]: {
    label: 'Medium',
    bg: 'bg-warning-muted',
    text: TextColor.WarningDefault,
  },
  [RiskLevel.High]: {
    label: 'High',
    bg: 'bg-error-muted',
    text: TextColor.ErrorDefault,
  },
  [RiskLevel.Unknown]: {
    label: 'N/A',
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

// ─── Check row (icon + title + optional description) ─────────────────────────

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

// ─── Risk factor row (title + description + badge) ───────────────────────────

const RiskFactorRow: React.FC<{
  title: string;
  description: string;
  level: RiskLevel;
}> = ({ title, description, level }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.FlexStart}
    justifyContent={BoxJustifyContent.SpaceBetween}
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

// ─── Main screen ─────────────────────────────────────────────────────────────

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
    if (!raw) return 'N/A';
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
    if (!raw) return 'N/A';
    try {
      const diffMs = Date.now() - new Date(raw).getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (days < 30) return `${days}d`;
      if (days < 365) return `${Math.floor(days / 30)}mo`;
      return `${Math.floor(days / 365)}yr`;
    } catch {
      return 'N/A';
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

  // ── Section 1 config ──
  const RESULT_CONFIG: Record<
    string,
    { heading: string; headingColor: TextColor; subtitle: string }
  > = {
    Verified: {
      heading: 'No risks detected',
      headingColor: TextColor.SuccessDefault,
      subtitle: `${params?.name ?? 'This token'} is one of the most secure and audited smart contract platforms. Low risk for rugpull or honeypot.`,
    },
    Benign: {
      heading: 'No risks detected',
      headingColor: TextColor.SuccessDefault,
      subtitle: 'No significant risks were detected for this token.',
    },
    Warning: {
      heading: 'Warning',
      headingColor: TextColor.WarningDefault,
      subtitle:
        'Some risk factors were detected. Review details before trading.',
    },
    Spam: {
      heading: 'Spam',
      headingColor: TextColor.WarningDefault,
      subtitle:
        'Some risk factors were detected. Review details before trading.',
    },
    Malicious: {
      heading: 'Malicious',
      headingColor: TextColor.ErrorDefault,
      subtitle: 'Significant risk factors detected. This token may be unsafe.',
    },
  };

  const resultConfig = RESULT_CONFIG[securityData?.resultType ?? ''] ?? {
    heading: 'Security data unavailable',
    headingColor: TextColor.TextAlternative,
    subtitle: 'Security analysis could not be loaded for this token.',
  };

  const whaleConcentrationLevel = getWhaleConcentrationRisk(top10Pct);
  const whaleDescription =
    top10Pct !== null
      ? `Top 10 wallets hold ${top10Pct.toFixed(0)}% of supply`
      : 'Distribution data unavailable';

  return (
    <View style={tw.style('flex-1 bg-default')} testID="security-trust-screen">
      {/* ── Header bar ── */}
      {/* padding: spacing/2 (8px) vertical, spacing/1 (4px) horizontal + safe area */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.SpaceBetween}
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

        {/* Centered title — flex-1 + text-center keeps it truly centered */}
        <Text
          variant={TextVariant.HeadingSm}
          color={TextColor.TextDefault}
          twClassName="flex-1 text-center"
        >
          {/* TODO: Localize this string and all other strings in this file*/}
          Security and trust
        </Text>

        {/* Spacer matching the back-button icon width so the title stays centered */}
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
              ? `${params.name} security analysis`
              : 'Security analysis'}
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
        <SectionHeader title="Risk factors" />
        <RiskFactorRow
          title="Whale concentration"
          description={whaleDescription}
          level={whaleConcentrationLevel}
        />
        <RiskFactorRow
          title="Staking Centralization"
          description="N/A"
          level={RiskLevel.Unknown}
        />
        <RiskFactorRow
          title="Smart Contract Risk"
          description={
            riskLevel === RiskLevel.Low
              ? `Battle-tested contracts${totalLiquidity ? ` with ${formatCompactUSD(totalLiquidity)} TVL` : ''}`
              : 'Review smart contract risks before trading'
          }
          level={getSmartContractRisk(securityData?.resultType)}
        />

        {/* ══ Section 3: Token Distribution ═══════════════════════════════════ */}
        <SectionHeader title="Token distribution" />

        {/* Total supply + Circulating supply */}
        <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 pb-3 gap-6">
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              Total supply
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
              Circulating supply
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="mt-0.5"
            >
              N/A
            </Text>
          </Box>
        </Box>

        {/* Stacked bar: top10 (blue) + other (grey) */}
        {top10Pct !== null && (
          <Box twClassName="px-4 pb-4">
            <Box twClassName="h-2 rounded-full overflow-hidden flex-row bg-[rgba(133,139,154,0.3)]">
              <Box twClassName="h-full bg-[#6B7FFF]" style={barFillStyle} />
            </Box>
          </Box>
        )}

        {/* Distribution rows grid: padding 4px 0, row-gap 12px, 2-col (label flex-1, value) */}
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Box twClassName="px-4" style={{ paddingVertical: 4, rowGap: 12 }}>
          {/* Top 10 holders */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.SpaceBetween}
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
                Top 10 holders
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
              {top10Pct !== null ? `${top10Pct.toFixed(1)}%` : 'N/A'}
            </Text>
          </Box>

          {/* Top 100 holders — not available from API */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.SpaceBetween}
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
                Top 100 holders
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Medium}
            >
              N/A
            </Text>
          </Box>

          {/* Other = 100 - top10 (approximate; ideally 100 - top100) */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.SpaceBetween}
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
                Other
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
              {otherPct !== null ? `${otherPct.toFixed(1)}%` : 'N/A'}
            </Text>
          </Box>
        </Box>

        {/* ══ Section 4: Contract Security ════════════════════════════════════ */}
        <SectionHeader title="Contract security" />
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Box twClassName="px-4 w-full" style={{ gap: 12 }}>
          <CheckRow
            label="Source code verified on Etherscan"
            description="Source code verified on Etherscan"
            isPositive={hasFeature(features, 'VERIFIED_CONTRACT')}
          />
          <CheckRow
            label="No mint function"
            description="Fixed supply, cannot mint new tokens"
            isPositive={!hasFeature(features, 'IS_MINTABLE')}
          />
          <CheckRow
            label="No blacklist"
            description="No address blacklisting capability"
            isPositive={!hasFeature(features, 'CAN_BLACKLIST')}
          />
        </Box>

        {/* ══ Section 5: Honeypot Analysis ════════════════════════════════════ */}
        <SectionHeader title="Honeypot analysis" />
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Box twClassName="px-4 w-full" style={{ gap: 12 }}>
          <CheckRow
            label="Buy/sell enabled"
            description="Trading is open in both directions" // todo: do we want another description for when all features are present?
            isPositive={
              !hasFeature(features, 'HONEYPOT') &&
              !hasFeature(features, 'RUGPULL') &&
              !hasFeature(features, 'TRANSFER_PAUSEABLE')
            }
          />
          <CheckRow
            label="No hidden fees"
            description="Transfer fees match expected values"
            isPositive={
              fees !== null &&
              fees.transfer === 0 &&
              fees.buy === 0 &&
              fees.sell === 0
            }
          />
          <CheckRow
            label="Slippage normal"
            description="N/A"
            isPositive={false}
          />
        </Box>

        {/* ══ Section 6: Liquidity ═════════════════════════════════════════════ */}
        <SectionHeader title="Liquidity" />
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Box twClassName="px-4 w-full" style={{ gap: 12 }}>
          <CheckRow
            label="Liquidity Locked"
            description={
              financialStats?.lockedLiquidityPct != null
                ? `${financialStats.lockedLiquidityPct.toFixed(0)}% of LP tokens locked`
                : 'Lock status unavailable'
            }
            isPositive={(financialStats?.lockedLiquidityPct ?? 0) > 0}
          />
          {totalLiquidity !== null && (
            <CheckRow
              label="Deep Liquidity"
              description={
                formatCompactUSD(totalLiquidity) + ' in liquidity pools'
              }
              isPositive={totalLiquidity > 100_000}
            />
          )}
          {financialStats?.markets && financialStats.markets.length > 1 && (
            <CheckRow
              label="Multiple DEXs"
              description={`Listed on ${financialStats.markets
                .map((m) => m.marketName)
                .filter(Boolean)
                .join(', ')}`}
              isPositive
            />
          )}
        </Box>

        {/* ══ Section 7: Audits & Reviews ══════════════════════════════════════ */}
        <SectionHeader title="Audits & Reviews" />
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Box twClassName="px-4 w-full" style={{ gap: 12 }}>
          {(
            ['Trail of bits', 'OpenZeppelin', 'Consensys Diligence'] as const
          ).map((auditor) => (
            <CheckRow
              key={auditor}
              label={auditor}
              description="N/A"
              isPositive={false}
            />
          ))}
        </Box>

        {/* ══ Section 8: Buy/Sell Tax ══════════════════════════════════════════ */}
        <SectionHeader title="Buy/Sell Tax" />
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Box twClassName="px-4 w-full" style={{ gap: 12 }}>
          {/* Three percentage columns */}
          <Box flexDirection={BoxFlexDirection.Row} twClassName="w-full">
            {(
              [
                { label: 'Buy tax', value: fees?.buy },
                { label: 'Sell tax', value: fees?.sell },
                { label: 'Transfer', value: fees?.transfer },
              ] as const
            ).map(({ label, value }) => (
              <Box
                key={label}
                twClassName="flex-1 py-1"
                gap={3}
                alignItems={BoxAlignItems.FlexStart}
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
          {/* No hidden fees tag */}
          {fees !== null &&
            fees.transfer === 0 &&
            fees.buy === 0 &&
            fees.sell === 0 && (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="bg-success-muted rounded"
                // eslint-disable-next-line react-native/no-inline-styles
                style={{
                  paddingHorizontal: 6,
                  minWidth: 22,
                  gap: 4,
                  alignSelf: 'flex-start',
                }}
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
                  No hidden fees detected
                </Text>
              </Box>
            )}
        </Box>

        {/* ══ Section 9: Token Info ════════════════════════════════════════════ */}
        <SectionHeader title="Token Info" />
        {/* 2-column grid: row-gap 8, column-gap 12 */}
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Box twClassName="px-4 w-full" style={{ gap: 8 }}>
          {/* Row 1: Created | Token age */}
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Box flexDirection={BoxFlexDirection.Row} style={{ gap: 12 }}>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                Created
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
                Token age
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {tokenAgeDisplay}
              </Text>
            </Box>
          </Box>
          {/* Row 2: Network | Type */}
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Box flexDirection={BoxFlexDirection.Row} style={{ gap: 12 }}>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                Network
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {networkName ?? 'N/A'}
              </Text>
            </Box>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                Type
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {tokenType}
              </Text>
            </Box>
          </Box>
        </Box>

        {/* ══ Section 10: On-chain Activity ════════════════════════════════════ */}
        <SectionHeader title="On-chain Activity" />
        {/* eslint-disable-next-line react-native/no-inline-styles */}
        <Box twClassName="px-4 w-full" style={{ gap: 8 }}>
          {/* Row 1: 24h Transactions | Active Wallets (24h) */}
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Box flexDirection={BoxFlexDirection.Row} style={{ gap: 12 }}>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                24h Transactions
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                N/A
              </Text>
            </Box>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                Active Wallets (24h)
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                N/A
              </Text>
            </Box>
          </Box>
          {/* Row 2: Avg Tx Value | Gas (avg) */}
          {/* eslint-disable-next-line react-native/no-inline-styles */}
          <Box flexDirection={BoxFlexDirection.Row} style={{ gap: 12 }}>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                Avg Tx Value
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                N/A
              </Text>
            </Box>
            <Box twClassName="flex-1 py-1">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                fontWeight={FontWeight.Medium}
              >
                Gas (avg)
              </Text>
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                N/A
              </Text>
            </Box>
          </Box>
        </Box>

        {/* ══ Section 11: Official Links ═══════════════════════════════════════ */}
        {metadata?.externalLinks && (
          <>
            <SectionHeader title="Official Links" />
            {/* Pills container: padding 4px 0, flex-wrap, gap 12 */}
            <Box
              twClassName="px-4 w-full"
              // eslint-disable-next-line react-native/no-inline-styles
              style={{
                paddingVertical: 4,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'center',
                alignContent: 'center',
              }}
            >
              {metadata.externalLinks.homepage && (
                <ButtonBase
                  onPress={() =>
                    openLink(metadata.externalLinks.homepage || '')
                  }
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 ${pressed ? 'opacity-70' : ''}`
                  }
                  // eslint-disable-next-line react-native/no-inline-styles
                  style={{ height: 32 }}
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
                    Website
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
                    `rounded-lg bg-muted px-3 ${pressed ? 'opacity-70' : ''}`
                  }
                  // eslint-disable-next-line react-native/no-inline-styles
                  style={{ height: 32 }}
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
                    Twitter / X
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
                    `rounded-lg bg-muted px-3 ${pressed ? 'opacity-70' : ''}`
                  }
                  // eslint-disable-next-line react-native/no-inline-styles
                  style={{ height: 32 }}
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
                    Telegram
                  </Text>
                </ButtonBase>
              )}
              {params?.address && !params.isNative && (
                <ButtonBase
                  onPress={() =>
                    openLink(`https://etherscan.io/address/${params.address}`)
                  }
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 ${pressed ? 'opacity-70' : ''}`
                  }
                  // eslint-disable-next-line react-native/no-inline-styles
                  style={{ height: 32 }}
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
                    Etherscan
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
