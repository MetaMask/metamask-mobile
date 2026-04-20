import React, { useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  Linking,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
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
  ButtonBaseSize,
} from '@metamask/design-system-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { selectEvmNetworkConfigurationsByChainId } from '../../../../selectors/networkController';
import { selectNonEvmNetworkConfigurationsByChainId } from '../../../../selectors/multichainNetworkController';
import { resolveNetworkDisplayName } from '../../NetworkMultiSelector/NetworkMultiSelectorUtils';
import type { TokenDetailsRouteParams } from '../../TokenDetails/constants/constants';
import {
  getFeatureTags,
  formatFeePercent,
  getTop10HoldingPct,
  formatCompactSupply,
  getResultTypeConfig,
} from '../utils/securityUtils';
import TokenDetailsStickyFooter from '../../TokenDetails/components/TokenDetailsStickyFooter';
import useBlockExplorer from '../../../hooks/useBlockExplorer';
import { useTokenActions } from '../../TokenDetails/hooks/useTokenActions';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { isCaipAssetType, parseCaipAssetType } from '@metamask/utils';

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text
    variant={TextVariant.HeadingMd}
    color={TextColor.TextDefault}
    twClassName="pt-6 pb-3"
  >
    {title}
  </Text>
);

const SecurityTrustScreen: React.FC = () => {
  const tw = useTailwind();
  const colorScheme = useColorScheme();
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const hasTrackedView = useRef(false);
  const timeSpentStart = useRef<number>(Date.now());

  const params = route.params as TokenDetailsRouteParams;
  const securityData = params?.securityData ?? null;
  const explorer = useBlockExplorer(params?.chainId);
  const evmNetworkConfigurations = useSelector(
    selectEvmNetworkConfigurationsByChainId,
  );
  const nonEvmNetworkConfigurations = useSelector(
    selectNonEvmNetworkConfigurationsByChainId,
  );
  const networkName = React.useMemo(() => {
    const chainId = params?.chainId;
    if (!chainId) {
      return undefined;
    }
    return resolveNetworkDisplayName({
      chainId,
      evmNetworkConfigurations,
      nonEvmNetworkConfigurations,
    });
  }, [params?.chainId, evmNetworkConfigurations, nonEvmNetworkConfigurations]);

  // Get action handlers from hook (single source of truth)
  const { onBuy, handleStickySwapPress, hasEligibleSwapTokens, networkModal } =
    useTokenActions({
      token: params,
      networkName,
    });

  // Track page view once
  useEffect(() => {
    if (!hasTrackedView.current) {
      hasTrackedView.current = true;
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SECURITY_PAGE_VIEWED)
          .addProperties({
            token_symbol: params.symbol,
            chain_id: params.chainId,
            severity: securityData?.resultType || 'unknown',
          })
          .build(),
      );
    }
  }, [
    params.symbol,
    params.chainId,
    securityData?.resultType,
    trackEvent,
    createEventBuilder,
  ]);

  const fees = securityData?.fees ?? null;
  const features = securityData?.features ?? [];
  const { tags: featureTags } = getFeatureTags(
    features,
    securityData?.resultType,
    true,
  );

  const {
    label: resultLabel,
    textColor: resultTextColor,
    subtitle: resultSubtitle,
    icon: tagIcon,
    iconColor: tagIconColor,
  } = getResultTypeConfig(securityData?.resultType);
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

  const openLink = useCallback(
    (url: string, itemType: string) => {
      // Track item tap
      trackEvent(
        createEventBuilder(MetaMetricsEvents.SECURITY_PAGE_ITEM_TAPPED)
          .addProperties({
            token_symbol: params.symbol,
            chain_id: params.chainId,
            item_type: itemType,
            severity: securityData?.resultType || 'unknown',
          })
          .build(),
      );

      Linking.openURL(url).catch(() => null);
    },
    [
      params.symbol,
      params.chainId,
      securityData?.resultType,
      trackEvent,
      createEventBuilder,
    ],
  );

  const scrollContentStyle = React.useMemo(
    () => ({
      paddingTop: 16,
      paddingBottom: insets.bottom + 24,
      paddingLeft: 16,
      paddingRight: 16,
    }),
    [insets.bottom],
  );

  return (
    <View style={tw.style('flex-1 bg-default')} testID="security-trust-screen">
      {networkModal}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => {
            const timeSpentMs = Date.now() - timeSpentStart.current;
            trackEvent(
              createEventBuilder(MetaMetricsEvents.SECURITY_PAGE_DISMISSED)
                .addProperties({
                  token_symbol: params.symbol,
                  chain_id: params.chainId,
                  time_spent_ms: timeSpentMs,
                  severity: securityData?.resultType || 'unknown',
                })
                .build(),
            );
            navigation.goBack();
          }}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          testID="security-trust-back-button"
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
          twClassName="pt-3 self-stretch"
        >
          <Text
            variant={TextVariant.HeadingMd}
            color={resultTextColor}
            fontWeight={'600' as FontWeight}
          >
            {resultLabel}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            twClassName="mt-3"
          >
            {resultSubtitle}
          </Text>
          {featureTags.length > 0 && (
            <Box
              flexDirection={BoxFlexDirection.Column}
              alignItems={BoxAlignItems.Start}
              twClassName="self-stretch mt-4"
              gap={4}
            >
              {featureTags.map((tag) => (
                <Box
                  key={tag.label}
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="w-full"
                  gap={3}
                >
                  {tagIcon && tagIconColor && (
                    <Icon
                      name={tagIcon}
                      size={IconSize.Md}
                      color={tagIconColor}
                    />
                  )}
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                  >
                    {tag.label}
                  </Text>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Box twClassName="pb-2 pt-8 self-stretch -mx-4">
          <Box twClassName="h-px bg-border-muted" />
        </Box>

        {/* ══ Section 2: Token Distribution ═══════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.token_distribution')} />

        <Box flexDirection={BoxFlexDirection.Row} twClassName="pb-3">
          <Box twClassName="flex-1">
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              fontWeight={FontWeight.Medium}
            >
              {strings('security_trust.total_supply')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextDefault}
              twClassName="mt-0.5"
            >
              {formatCompactSupply(financialStats?.supply, params?.decimals)}{' '}
              {params?.symbol ?? ''}
            </Text>
          </Box>
        </Box>

        {top10Pct !== null && (
          <Box twClassName="pb-3">
            <Box
              twClassName={`h-2 rounded-full overflow-hidden flex-row ${
                colorScheme === 'dark'
                  ? 'bg-[rgba(237,239,242,0.3)]'
                  : 'bg-[rgba(133,139,154,0.77)]'
              }`}
            >
              <Box
                twClassName="h-full bg-primary-default"
                style={barFillStyle}
              />
            </Box>
          </Box>
        )}

        <Box twClassName="gap-y-1">
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
              <Box twClassName="w-3 h-3 rounded-full bg-primary-default" />
              <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
                {strings('security_trust.top_10_holders')}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={
                top10Pct !== null
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
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
              <Box
                twClassName={`w-3 h-3 rounded-full ${
                  colorScheme === 'dark'
                    ? 'bg-[rgba(237,239,242,0.3)]'
                    : 'bg-[rgba(133,139,154,0.77)]'
                }`}
              />
              <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
                {strings('security_trust.other')}
              </Text>
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={
                otherPct !== null
                  ? TextColor.TextDefault
                  : TextColor.TextAlternative
              }
            >
              {otherPct !== null
                ? `${otherPct.toFixed(1)}%`
                : strings('security_trust.na')}
            </Text>
          </Box>
        </Box>

        <Box twClassName="pb-2 pt-8 self-stretch -mx-4">
          <Box twClassName="h-px bg-border-muted" />
        </Box>

        {/* ══ Section 8: Buy/Sell Tax ══════════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.buy_sell_tax')} />
        <Box twClassName="w-full" gap={3}>
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
                twClassName="flex-1"
                alignItems={BoxAlignItems.Start}
              >
                <Text
                  variant={TextVariant.HeadingLg}
                  color={TextColor.TextDefault}
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

        <Box twClassName="pb-2 pt-8 self-stretch -mx-4">
          <Box twClassName="h-px bg-border-muted" />
        </Box>

        {/* ══ Section 9: Token Info ════════════════════════════════════════════ */}
        <SectionHeader title={strings('security_trust.token_info')} />
        <Box twClassName="w-full" gap={3}>
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

        <Box twClassName="pb-2 pt-8 self-stretch -mx-4">
          <Box twClassName="h-px bg-border-muted" />
        </Box>

        {/* ══ Section 11: Official Links ═══════════════════════════════════════ */}
        {metadata?.externalLinks && (
          <>
            <SectionHeader title={strings('security_trust.official_links')} />
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              gap={2}
              twClassName="w-full flex-wrap"
            >
              {metadata.externalLinks.homepage && (
                <ButtonBase
                  onPress={() =>
                    openLink(metadata.externalLinks.homepage || '', 'website')
                  }
                  size={ButtonBaseSize.Md}
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 ${pressed ? 'opacity-70' : ''}`
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
                    fontWeight={FontWeight.Medium}
                    twClassName="text-center"
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
                      'twitter',
                    )
                  }
                  size={ButtonBaseSize.Md}
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 ${pressed ? 'opacity-70' : ''}`
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
                    fontWeight={FontWeight.Medium}
                    twClassName="text-center"
                  >
                    {`@${metadata.externalLinks.twitterPage}`}
                  </Text>
                </ButtonBase>
              )}
              {metadata.externalLinks.telegramChannelId && (
                <ButtonBase
                  onPress={() =>
                    openLink(
                      `https://t.me/${metadata.externalLinks.telegramChannelId}`,
                      'telegram',
                    )
                  }
                  size={ButtonBaseSize.Md}
                  twClassName={(pressed) =>
                    `rounded-lg bg-muted px-3 ${pressed ? 'opacity-70' : ''}`
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
                    fontWeight={FontWeight.Medium}
                    twClassName="text-center"
                  >
                    {strings('security_trust.telegram')}
                  </Text>
                </ButtonBase>
              )}
              {Boolean(params?.address && !params.isNative) &&
                (() => {
                  const tokenAddress = isCaipAssetType(params.address)
                    ? parseCaipAssetType(params.address).assetReference
                    : params.address;
                  const blockExplorerUrl = explorer.getBlockExplorerTokenUrl(
                    tokenAddress,
                    params.chainId,
                  );
                  const blockExplorerName = explorer.getBlockExplorerName(
                    params.chainId,
                  );

                  return blockExplorerUrl ? (
                    <ButtonBase
                      onPress={() =>
                        openLink(blockExplorerUrl, 'block_explorer')
                      }
                      size={ButtonBaseSize.Md}
                      twClassName={(pressed) =>
                        `rounded-lg bg-muted px-3 ${pressed ? 'opacity-70' : ''}`
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
                        fontWeight={FontWeight.Medium}
                        twClassName="text-center"
                      >
                        {blockExplorerName ||
                          strings('security_trust.etherscan')}
                      </Text>
                    </ButtonBase>
                  ) : null;
                })()}
            </Box>
          </>
        )}
        <Box twClassName="py-8 self-stretch -mx-4">
          <Box twClassName="h-px bg-border-muted" />
        </Box>
        <Box
          justifyContent={BoxJustifyContent.Center}
          alignItems={BoxAlignItems.Center}
          twClassName="self-stretch"
        >
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('security_trust.evaluation_disclaimer')}
          </Text>
        </Box>
      </ScrollView>
      <TokenDetailsStickyFooter
        token={params}
        securityData={securityData}
        onBuy={onBuy}
        onSwap={handleStickySwapPress}
        hasEligibleSwapTokens={hasEligibleSwapTokens}
      />
    </View>
  );
};

export default SecurityTrustScreen;
