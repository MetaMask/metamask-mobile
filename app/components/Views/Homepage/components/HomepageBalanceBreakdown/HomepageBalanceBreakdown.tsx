import React, { useCallback } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics/MetaMetrics.events';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import AccountGroupBalance from '../../../../UI/Assets/components/Balance/AccountGroupBalance';
import { useMoneyNavigation } from '../../../../UI/Money/hooks/useMoneyNavigation';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import { useFormatters } from '../../../../hooks/useFormatters';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { usePerpsNavigationHandlers } from '../../Sections/Perpetuals/hooks/usePerpsNavigationHandlers';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { SLICE_ORDER } from '../../../BalanceBreakdown/constants';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { useBalanceBreakdown } from '../../../BalanceBreakdown/hooks/useBalanceBreakdown';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import type { SliceData, SliceKey } from '../../../BalanceBreakdown/types';
import type { HomepageBalanceBreakdownLayout } from '../../abTestConfig';
import { HomepageBalanceBreakdownTestIds } from './HomepageBalanceBreakdown.testIds';

const SLICE_ICONS: Partial<Record<SliceKey, IconName>> = {
  money: IconName.Musd,
  tokens: IconName.Ethereum,
  predict: IconName.Predictions,
};

const SLICE_ICON_SYMBOLS: Partial<Record<SliceKey, string>> = {
  perps: '∞',
  defi: '%',
};

const SLICE_LABEL_KEYS = {
  money: 'homepage.sections.money',
  tokens: 'homepage.sections.tokens',
  perps: 'homepage.sections.perpetuals',
  predict: 'homepage.sections.predictions',
  defi: 'homepage.sections.defi',
} as const;

const getSliceLabel = (key: SliceKey): string => strings(SLICE_LABEL_KEYS[key]);

const getAllocationColorStyle = (slice: SliceData): ViewStyle => ({
  backgroundColor: slice.color,
});

const getAllocationSegmentStyle = (slice: SliceData): ViewStyle => ({
  ...getAllocationColorStyle(slice),
  borderRadius: 999,
  flexBasis: 0,
  flexGrow: slice.percentOfTotal,
  minWidth: 4,
});

interface BreakdownRowProps {
  slice: SliceData;
  userCurrency: string;
  onPress: () => void;
  layout: HomepageBalanceBreakdownLayout;
}

const BreakdownRow = ({
  slice,
  userCurrency,
  onPress,
  layout = 'icons',
}: BreakdownRowProps) => {
  const tw = useTailwind();
  const privacyMode = useSelector(selectPrivacyMode);
  const { formatCurrency } = useFormatters();
  const isLoading = slice.status === 'loading';
  const percentageLabel =
    slice.status === 'ready'
      ? `${Math.round(slice.percentOfTotal * 100)}%`
      : null;
  const displayValue =
    slice.status === 'error' || slice.status === 'ineligible'
      ? '—'
      : formatCurrency(slice.valueFiat, userCurrency);
  const moneyApy = slice.apyPercentFormatted;
  const showIcon = layout === 'icons';
  const showAllocationDot = layout === 'allocation';
  const iconName = SLICE_ICONS[slice.key];
  const iconSymbol = SLICE_ICON_SYMBOLS[slice.key];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={HomepageBalanceBreakdownTestIds.ROW(slice.key)}
      style={({ pressed }) =>
        tw.style('flex-row items-center', 'min-h-10', pressed && 'opacity-80')
      }
    >
      {showIcon ? (
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="h-8 w-8 rounded-full bg-muted"
        >
          {iconName ? (
            <Icon
              color={IconColor.IconDefault}
              name={iconName}
              size={IconSize.Md}
              testID={HomepageBalanceBreakdownTestIds.ICON(slice.key)}
            />
          ) : (
            <Text
              color={TextColor.TextDefault}
              fontWeight={FontWeight.Medium}
              testID={HomepageBalanceBreakdownTestIds.ICON(slice.key)}
              variant={TextVariant.HeadingSm}
            >
              {iconSymbol}
            </Text>
          )}
        </Box>
      ) : null}
      <Box twClassName={showIcon ? 'ml-3 min-w-0 flex-1' : 'min-w-0 flex-1'}>
        <Box
          alignItems={BoxAlignItems.Center}
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          gap={3}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            flexDirection={BoxFlexDirection.Row}
            twClassName="min-w-0 flex-1"
            gap={2}
          >
            <Box
              alignItems={BoxAlignItems.Center}
              flexDirection={BoxFlexDirection.Row}
              twClassName="min-w-0 shrink"
              gap={2}
            >
              {showAllocationDot ? (
                <View
                  testID={HomepageBalanceBreakdownTestIds.DOT(slice.key)}
                  style={[
                    tw.style('h-2 w-2 rounded-full'),
                    getAllocationColorStyle(slice),
                  ]}
                />
              ) : null}
              <Text
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Medium}
                numberOfLines={1}
                twClassName="shrink"
                variant={TextVariant.BodyMd}
              >
                {getSliceLabel(slice.key)}
              </Text>
              {percentageLabel ? (
                <>
                  <Text
                    color={TextColor.TextAlternative}
                    variant={TextVariant.BodyMd}
                  >
                    ·
                  </Text>
                  <SensitiveText
                    color={TextColor.TextAlternative}
                    isHidden={privacyMode}
                    length={SensitiveTextLength.Short}
                    testID={HomepageBalanceBreakdownTestIds.PERCENTAGE(
                      slice.key,
                    )}
                    variant={TextVariant.BodyMd}
                  >
                    {percentageLabel}
                  </SensitiveText>
                </>
              ) : null}
            </Box>
            {slice.key === 'money' && slice.apyLoading ? (
              <Skeleton
                height={20}
                testID={HomepageBalanceBreakdownTestIds.APY_SKELETON}
                twClassName="shrink-0"
                width={60}
              />
            ) : moneyApy ? (
              <Box
                testID={HomepageBalanceBreakdownTestIds.APY}
                twClassName="shrink-0 rounded-md bg-success-muted px-1.5 py-0.5"
              >
                <Text
                  color={TextColor.SuccessDefault}
                  fontWeight={FontWeight.Medium}
                  variant={TextVariant.BodySm}
                >
                  {moneyApy} APY
                </Text>
              </Box>
            ) : null}
          </Box>
          <Skeleton
            hideChildren={isLoading}
            testID={HomepageBalanceBreakdownTestIds.SKELETON(slice.key)}
          >
            <SensitiveText
              isHidden={privacyMode}
              length={SensitiveTextLength.Medium}
              testID={HomepageBalanceBreakdownTestIds.VALUE(slice.key)}
              variant={TextVariant.BodyMd}
            >
              {displayValue}
            </SensitiveText>
          </Skeleton>
        </Box>
      </Box>
    </Pressable>
  );
};

export interface HomepageBalanceBreakdownProps {
  hideRows?: boolean;
  accountGroupBalanceProps?: React.ComponentProps<typeof AccountGroupBalance>;
  layout: HomepageBalanceBreakdownLayout;
  children?: React.ReactNode;
}

const HomepageBalanceBreakdown = ({
  hideRows = false,
  accountGroupBalanceProps,
  layout,
  children,
}: HomepageBalanceBreakdownProps) => {
  const navigation = useNavigation();
  const { navigateToMoneyHome } = useMoneyNavigation();
  const { handleViewAllPerps } = usePerpsNavigationHandlers();
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { hero, slices } = useBalanceBreakdown();
  const openSlice = useCallback(
    (key: SliceKey) => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.BALANCE_BREAKDOWN_SLICE_TAPPED)
          .addProperties({
            slice: key,
            source: 'homepage',
          })
          .build(),
      );

      switch (key) {
        case 'money':
          navigateToMoneyHome();
          break;
        case 'tokens':
          navigation.navigate(Routes.WALLET.TOKENS_FULL_VIEW);
          break;
        case 'perps':
          handleViewAllPerps();
          break;
        case 'predict':
          navigation.navigate(Routes.PREDICT.ROOT, {
            screen: Routes.PREDICT.MARKET_LIST,
            params: {
              entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
            },
          });
          break;
        case 'defi':
          navigation.navigate(Routes.WALLET.DEFI_FULL_VIEW);
          break;
      }
    },
    [
      createEventBuilder,
      handleViewAllPerps,
      navigateToMoneyHome,
      navigation,
      trackEvent,
    ],
  );

  return (
    <Box testID={HomepageBalanceBreakdownTestIds.CONTAINER}>
      <AccountGroupBalance {...accountGroupBalanceProps} heroOverride={hero} />
      {children ? <Box twClassName="mt-4 gap-4">{children}</Box> : null}
      {!hideRows ? (
        <Box
          testID={HomepageBalanceBreakdownTestIds.ROWS}
          twClassName="mt-3 px-4"
        >
          {layout === 'allocation' ? (
            <Box twClassName="mb-2 gap-3">
              <Text
                fontWeight={FontWeight.Medium}
                testID={HomepageBalanceBreakdownTestIds.ALLOCATION_TITLE}
                variant={TextVariant.HeadingSm}
              >
                {strings('balance_breakdown.allocation')}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                gap={1}
                testID={HomepageBalanceBreakdownTestIds.ALLOCATION_BAR}
                twClassName="h-1.5 overflow-hidden rounded-full"
              >
                {SLICE_ORDER.filter(
                  (key) =>
                    slices[key].status === 'ready' &&
                    slices[key].percentOfTotal > 0,
                ).map((key) => (
                  <View
                    key={key}
                    testID={HomepageBalanceBreakdownTestIds.ALLOCATION_SEGMENT(
                      key,
                    )}
                    style={getAllocationSegmentStyle(slices[key])}
                  />
                ))}
              </Box>
            </Box>
          ) : null}
          {SLICE_ORDER.map((key) => (
            <BreakdownRow
              key={key}
              layout={layout}
              onPress={() => openSlice(key)}
              slice={slices[key]}
              userCurrency={hero.userCurrency}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
};

export default HomepageBalanceBreakdown;
