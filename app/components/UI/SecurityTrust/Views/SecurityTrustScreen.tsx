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
import {
  getFeatureTags,
  formatFeePercent,
  getTop10HoldingPct,
  formatCompactSupply,
} from '../utils/securityUtils';
import TokenDetailsStickyFooter from '../../TokenDetails/components/TokenDetailsStickyFooter';

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

const SecurityTrustScreen: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();

  const params = route.params as TokenDetailsRouteParams;
  const securityData = params?.securityData ?? null;

  const fees = securityData?.fees ?? null;
  const features = securityData?.features ?? [];
  const { tags: featureTags } = getFeatureTags(
    features,
    securityData?.resultType,
    true,
  );

  const tagIcon =
    securityData?.resultType === 'Malicious'
      ? IconName.Danger
      : securityData?.resultType === 'Warning' ||
          securityData?.resultType === 'Spam'
        ? IconName.Warning
        : IconName.SecurityTick;
  const tagIconColor =
    securityData?.resultType === 'Malicious'
      ? IconColor.ErrorDefault
      : securityData?.resultType === 'Warning' ||
          securityData?.resultType === 'Spam'
        ? IconColor.WarningDefault
        : IconColor.SuccessDefault;
  const financialStats = securityData?.financialStats ?? null;
  const metadata = securityData?.metadata ?? null;

  const top10Pct = getTop10HoldingPct(financialStats);
  const otherPct = top10Pct !== null ? Math.max(0, 100 - top10Pct) : null;
  const barFillStyle = React.useMemo(
    () => ({ width: `${top10Pct ?? 0}%` as `${number}%` }),
    [top10Pct],
  );
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
      heading: strings('security_trust.safe'),
      headingColor: TextColor.SuccessDefault,
      subtitle: strings('security_trust.subtitle_safe'),
    },
    Benign: {
      heading: strings('security_trust.safe'),
      headingColor: TextColor.SuccessDefault,
      subtitle: strings('security_trust.subtitle_safe'),
    },
    Warning: {
      heading: strings('security_trust.medium_risk'),
      headingColor: TextColor.WarningDefault,
      subtitle: strings('security_trust.subtitle_medium_risk'),
    },
    Spam: {
      heading: strings('security_trust.medium_risk'),
      headingColor: TextColor.WarningDefault,
      subtitle: strings('security_trust.subtitle_medium_risk'),
    },
    Malicious: {
      heading: strings('security_trust.high_risk'),
      headingColor: TextColor.ErrorDefault,
      subtitle: strings('security_trust.subtitle_high_risk'),
    },
  };

  const resultConfig = RESULT_CONFIG[securityData?.resultType ?? ''] ?? {
    heading: strings('security_trust.data_unavailable'),
    headingColor: TextColor.TextAlternative,
    subtitle: strings('security_trust.subtitle_unavailable'),
  };

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
        style={tw.style('flex-1')}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={scrollContentStyle}
      >
        {/* ══ Section 1: Security Score header ════════════════════════════════ */}
        <Box
          flexDirection={BoxFlexDirection.Column}
          alignItems={BoxAlignItems.Start}
          twClassName="px-4 pt-3 self-stretch"
          gap={3}
        >
          <Text
            variant={TextVariant.HeadingMd}
            color={resultConfig.headingColor}
          >
            {resultConfig.heading}
          </Text>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {resultConfig.subtitle}
          </Text>
          {featureTags.length > 0 && (
            <Box
              flexDirection={BoxFlexDirection.Column}
              alignItems={BoxAlignItems.Start}
              twClassName="self-stretch"
            >
              {featureTags.map((tag) => (
                <Box
                  key={tag.label}
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="w-full h-10 py-2"
                  gap={3}
                >
                  <Icon
                    name={tagIcon}
                    size={IconSize.Sm}
                    color={tagIconColor}
                  />
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    fontWeight={FontWeight.Medium}
                  >
                    {tag.label}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Divider />

        {/* ══ Section 2: Token Distribution ═══════════════════════════════════ */}
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
      <TokenDetailsStickyFooter
        token={params}
        securityData={securityData}
        networkName={networkName}
      />
    </View>
  );
};

export default SecurityTrustScreen;
