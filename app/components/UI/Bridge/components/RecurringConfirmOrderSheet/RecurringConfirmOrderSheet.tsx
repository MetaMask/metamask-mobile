import React, { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Image } from 'react-native';
import { useSelector } from 'react-redux';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BannerAlert,
  BannerAlertSeverity,
  BottomSheet,
  BottomSheetFooter,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconColor,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { DiscountType } from '@metamask/bridge-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import I18n, { strings } from '../../../../../../locales/i18n';
import {
  selectDestToken,
  selectRecurringPriceRange,
  selectRecurringRepeatCount,
  selectRecurringPriceTolerance,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { getNetworkImageSource } from '../../../../../util/networks';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useFeeDisclaimer } from '../../hooks/useFeeDisclaimer';
import useIsInsufficientBalance from '../../hooks/useInsufficientBalance';
import { useHasSufficientGas } from '../../hooks/useHasSufficientGas';
import type { BridgeToken } from '../../types';
import { formatMinimumReceived } from '../../utils/currencyUtils';
import { getTokenImageSource } from '../../utils';
import { multiplyAmountByCount } from '../../utils/recurringConfirmTotals';
import {
  formatPriceRangeLabel,
  USD_PRICE_RANGE_CURRENCY,
} from '../../utils/priceRange';
import { parsePositiveInteger } from '../../utils/recurringSchedule';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import MembershipVipBadge from '../../../shared/MembershipVipBadge';
import { RewardsDiscountBadge } from '../../../Rewards/components/RewardsDiscountBadge';
import { RecurringConfirmOrderSheetSelectorsIDs } from './RecurringConfirmOrderSheet.testIds';
import type { RecurringConfirmOrderSheetProps } from './RecurringConfirmOrderSheet.types';
import { useBridgeSession } from '../../hooks/useBridgeSession';
import BottomSheetHeaderGlass from '../../../../../component-library/components-temp/BottomSheetHeaderGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { selectBridgeRecurringBuyDefaultPriceTolerance } from '../../../../../selectors/bridge/featureFlags';
import { LimitOrderCostToleranceTooltip } from '../LimitOrderCostToleranceTooltip';

const QUOTE_VALUE_SKELETON_WIDTH = 72;
const QUOTE_VALUE_SKELETON_HEIGHT = 20;

const NETWORK_BADGE_SIZE = 10;

function TokenAvatar({
  token,
  size,
  testID,
}: {
  token: BridgeToken;
  size: AvatarTokenSize;
  testID?: string;
}) {
  const tw = useTailwind();
  const tokenImageSource = getTokenImageSource(
    token.symbol,
    token.image,
    token.address,
    token.chainId,
  );
  const networkImageSource = getNetworkImageSource({ chainId: token.chainId });

  return (
    <BadgeWrapper
      twClassName="self-center"
      position={BadgeWrapperPosition.BottomRight}
      badge={
        <Box
          twClassName="overflow-hidden border-2 border-background-default bg-default rounded-[2px]"
          style={{
            width: NETWORK_BADGE_SIZE,
            height: NETWORK_BADGE_SIZE,
          }}
        >
          {networkImageSource ? (
            <Image
              source={networkImageSource}
              style={tw.style('h-full w-full')}
            />
          ) : null}
        </Box>
      }
    >
      <AvatarToken
        name={token.symbol}
        src={tokenImageSource}
        size={size}
        twClassName={tokenImageSource ? 'bg-elevated1' : undefined}
        testID={testID}
      />
    </BadgeWrapper>
  );
}

function ConfirmOrderRow({
  label,
  value,
  testID,
  trailing,
  labelAccessory,
  isLoading,
  skeletonTestID,
}: {
  label: ReactNode;
  value: string;
  testID: string;
  trailing?: ReactNode;
  labelAccessory?: ReactNode;
  isLoading?: boolean;
  skeletonTestID?: string;
}) {
  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      gap={2}
      paddingHorizontal={4}
      paddingVertical={2}
      testID={testID}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName="shrink"
      >
        {typeof label === 'string' ? (
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {label}
          </Text>
        ) : (
          label
        )}
        {labelAccessory}
      </Box>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={2}
        twClassName="shrink"
      >
        {isLoading ? (
          <Skeleton
            width={QUOTE_VALUE_SKELETON_WIDTH}
            height={QUOTE_VALUE_SKELETON_HEIGHT}
            testID={skeletonTestID}
          />
        ) : (
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            twClassName="text-right"
          >
            {value}
          </Text>
        )}
        {trailing}
      </Box>
    </Box>
  );
}

function formatTokenAmountValue(
  amount: string | undefined,
  symbol?: string,
): string {
  if (!amount || !symbol) {
    return '--';
  }

  return `${formatMinimumReceived(amount)} ${symbol}`;
}

const RecurringConfirmOrderSheet = ({
  currentCurrency,
  delegationFee,
  fiatToUsdRate,
  isPriceRangeConversionReady,
  isSubmitting,
  onConfirm,
  onDelegationFeeInfoPress,
  goBack,
}: RecurringConfirmOrderSheetProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const sheetRef = useRef<BottomSheetRef>(null);
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const priceRange = useSelector(selectRecurringPriceRange);
  const repeatCount = useSelector(selectRecurringRepeatCount);
  const recurringPriceTolerance = useSelector(selectRecurringPriceTolerance);
  const defaultPriceTolerance = useSelector(
    selectBridgeRecurringBuyDefaultPriceTolerance,
  );
  const { activeQuote, destTokenAmount, formattedQuoteData, isLoading } =
    useBridgeQuoteDataContext();
  const { latestSourceBalance } = useBridgeSession();
  const hasInsufficientBalance = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceBalance?.atomicBalance,
  });
  const hasSufficientGas = useHasSufficientGas({
    additionalGasFeeInHex:
      delegationFee.status === 'ready'
        ? delegationFee.preciseNativeFeeInHex
        : undefined,
    quote: activeQuote,
  });
  const hasInsufficientGas = !hasSufficientGas;
  const isDelegationFeeReady =
    delegationFee.status === 'ready' || delegationFee.status === 'not-required';
  const showDelegationFee =
    delegationFee.status === 'loading' ||
    delegationFee.status === 'ready' ||
    delegationFee.status === 'error';
  const isConfirmDisabled =
    hasInsufficientBalance ||
    hasInsufficientGas ||
    !isDelegationFeeReady ||
    !isPriceRangeConversionReady;
  const confirmLabel = hasInsufficientBalance
    ? strings('bridge.insufficient_funds')
    : hasInsufficientGas
      ? strings('bridge.insufficient_gas')
      : strings('bridge.recurring.confirm');
  const { discountBadge, infoText, infoSuffix, baseFeePercentage } =
    useFeeDisclaimer({ activeQuote });
  const isRewardsTierBadge =
    discountBadge?.type === DiscountType.VIP ||
    discountBadge?.type === DiscountType.SUBSCRIPTION;
  const showQuoteSkeletons = isLoading;
  const hasFeeDisclaimer =
    Boolean(infoText) || Boolean(infoSuffix) || Boolean(discountBadge);

  const repeat = parsePositiveInteger(repeatCount);
  const payingPerOrder = formatTokenAmountValue(
    sourceAmount,
    sourceToken?.symbol,
  );
  const payingAllOrders = formatTokenAmountValue(
    sourceAmount && repeat !== undefined
      ? multiplyAmountByCount(sourceAmount, repeat)
      : undefined,
    sourceToken?.symbol,
  );
  const estReceivingPerOrder = destTokenAmount
    ? formatMinimumReceived(destTokenAmount)
    : '--';
  const estReceivingAllOrders =
    destTokenAmount && repeat !== undefined
      ? formatMinimumReceived(
          multiplyAmountByCount(destTokenAmount, repeat) ?? destTokenAmount,
        )
      : '--';
  const priceRangeToken = priceRange
    ? priceRange.tokenSide === 'source'
      ? sourceToken
      : destToken
    : undefined;
  const priceRangeValue = priceRange
    ? formatPriceRangeLabel(priceRange.min, priceRange.max, priceRange.currency)
    : strings('bridge.recurring.price_range.not_set');
  const showLocalCurrencyNotice =
    Boolean(priceRange) &&
    currentCurrency.toUpperCase() !== USD_PRICE_RANGE_CURRENCY;
  const usdToCurrentCurrencyRate =
    fiatToUsdRate !== undefined &&
    Number.isFinite(fiatToUsdRate) &&
    fiatToUsdRate > 0
      ? getIntlNumberFormatter(I18n.locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(1 / fiatToUsdRate)
      : '--';

  const nativeToken = useMemo(
    () =>
      sourceToken?.chainId
        ? getNativeSourceToken(sourceToken.chainId)
        : undefined,
    [sourceToken?.chainId],
  );

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      testID={RecurringConfirmOrderSheetSelectorsIDs.SHEET}
      goBack={goBack}
    >
      <BottomSheetHeaderGlass
        isGlass={isGlassHeader}
        onClose={closeSheet}
        closeButtonProps={{
          testID: RecurringConfirmOrderSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.confirm_title')}
      </BottomSheetHeaderGlass>
      {showLocalCurrencyNotice ? (
        <Box paddingHorizontal={4} paddingBottom={2}>
          <BannerAlert
            severity={BannerAlertSeverity.Info}
            description={strings('bridge.recurring.local_currency_notice', {
              rate: usdToCurrentCurrencyRate,
              currency: currentCurrency.toUpperCase(),
            })}
            descriptionProps={{
              variant: TextVariant.BodyMd,
              color: TextColor.TextDefault,
            }}
            testID={
              RecurringConfirmOrderSheetSelectorsIDs.LOCAL_CURRENCY_NOTICE
            }
          />
        </Box>
      ) : null}
      <Box paddingBottom={2}>
        <ConfirmOrderRow
          label={strings('bridge.recurring.paying_all_orders')}
          value={payingAllOrders}
          testID={RecurringConfirmOrderSheetSelectorsIDs.PAYING_ALL_ORDERS}
          trailing={
            sourceToken ? (
              <TokenAvatar token={sourceToken} size={AvatarTokenSize.Xs} />
            ) : undefined
          }
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.paying_per_order')}
          value={payingPerOrder}
          testID={RecurringConfirmOrderSheetSelectorsIDs.PAYING_PER_ORDER}
          trailing={
            sourceToken ? (
              <TokenAvatar token={sourceToken} size={AvatarTokenSize.Xs} />
            ) : undefined
          }
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.receiving')}
          value={destToken?.symbol ?? '--'}
          testID={RecurringConfirmOrderSheetSelectorsIDs.RECEIVING}
          trailing={
            destToken ? (
              <TokenAvatar
                token={destToken}
                size={AvatarTokenSize.Xs}
                testID={RecurringConfirmOrderSheetSelectorsIDs.RECEIVING_TOKEN}
              />
            ) : undefined
          }
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.price_range.label')}
          value={priceRangeValue}
          testID={RecurringConfirmOrderSheetSelectorsIDs.PRICE_RANGE}
          trailing={
            priceRangeToken ? (
              <TokenAvatar
                token={priceRangeToken}
                size={AvatarTokenSize.Xs}
                testID={
                  RecurringConfirmOrderSheetSelectorsIDs.PRICE_RANGE_TOKEN
                }
              />
            ) : undefined
          }
        />
        <Box twClassName="mx-4 my-2 h-px bg-muted" />
        <ConfirmOrderRow
          label={strings('bridge.recurring.est_receiving_per_order')}
          value={
            destToken?.symbol
              ? `${estReceivingPerOrder} ${destToken.symbol}`
              : estReceivingPerOrder
          }
          testID={
            RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER
          }
          isLoading={showQuoteSkeletons}
          skeletonTestID={
            RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_SKELETON
          }
          trailing={
            destToken ? (
              <TokenAvatar
                token={destToken}
                size={AvatarTokenSize.Xs}
                testID={
                  RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_TOKEN
                }
              />
            ) : undefined
          }
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.est_receiving_all_orders')}
          value={
            destToken?.symbol
              ? `${estReceivingAllOrders} ${destToken.symbol}`
              : estReceivingAllOrders
          }
          testID={
            RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS
          }
          isLoading={showQuoteSkeletons}
          skeletonTestID={
            RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS_SKELETON
          }
          trailing={
            destToken ? (
              <TokenAvatar
                token={destToken}
                size={AvatarTokenSize.Xs}
                testID={
                  RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS_TOKEN
                }
              />
            ) : undefined
          }
        />
        <Box twClassName="mx-4 my-2 h-px bg-muted" />
        <ConfirmOrderRow
          label={
            <LimitOrderCostToleranceTooltip
              testID={
                RecurringConfirmOrderSheetSelectorsIDs.PRICE_TOLERANCE_TOOLTIP
              }
            />
          }
          value={`${recurringPriceTolerance ?? defaultPriceTolerance}%`}
          testID={RecurringConfirmOrderSheetSelectorsIDs.PRICE_TOLERANCE}
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.est_network_fee_per_order')}
          value={formattedQuoteData?.networkFee ?? '-'}
          testID={RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE}
          isLoading={showQuoteSkeletons}
          skeletonTestID={
            RecurringConfirmOrderSheetSelectorsIDs.NETWORK_FEE_SKELETON
          }
          trailing={
            nativeToken ? (
              <TokenAvatar token={nativeToken} size={AvatarTokenSize.Xs} />
            ) : undefined
          }
        />
        {showDelegationFee ? (
          <>
            <Box twClassName="mx-4 my-2 h-px bg-muted" />
            <ConfirmOrderRow
              label={strings('bridge.recurring.account_upgrade_fee')}
              value={
                delegationFee.status === 'ready'
                  ? delegationFee.displayFee
                  : '--'
              }
              testID={RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE}
              isLoading={delegationFee.status === 'loading'}
              skeletonTestID={
                RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE_SKELETON
              }
              labelAccessory={
                <ButtonIcon
                  iconName={IconName.Info}
                  iconProps={{ color: IconColor.IconAlternative }}
                  size={ButtonIconSize.Sm}
                  onPress={onDelegationFeeInfoPress}
                  testID={
                    RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE_INFO
                  }
                  accessibilityLabel={strings(
                    'bridge.recurring.account_upgrade_fee_info_title',
                  )}
                />
              }
              trailing={
                delegationFee.status === 'ready' && nativeToken ? (
                  <TokenAvatar
                    token={nativeToken}
                    size={AvatarTokenSize.Xs}
                    testID={
                      RecurringConfirmOrderSheetSelectorsIDs.DELEGATION_FEE_TOKEN
                    }
                  />
                ) : undefined
              }
            />
          </>
        ) : null}
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: confirmLabel,
          onPress: onConfirm,
          isDisabled: isConfirmDisabled || isSubmitting,
          isLoading: isSubmitting,
          testID: RecurringConfirmOrderSheetSelectorsIDs.CONFIRM_BUTTON,
        }}
      />
      {!showQuoteSkeletons && hasFeeDisclaimer ? (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          gap={2}
          paddingHorizontal={4}
          paddingBottom={4}
          twClassName="flex-wrap"
          testID={RecurringConfirmOrderSheetSelectorsIDs.FEE_DISCLAIMER}
        >
          {discountBadge ? (
            isRewardsTierBadge ? (
              <MembershipVipBadge
                hasProEntitlement={
                  discountBadge.type === DiscountType.SUBSCRIPTION
                }
              />
            ) : (
              <RewardsDiscountBadge label={discountBadge.label} />
            )
          ) : null}
          {infoText ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              twClassName="text-center"
            >
              {infoText}
            </Text>
          ) : null}
          {baseFeePercentage ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
              twClassName="line-through"
            >
              {baseFeePercentage}
            </Text>
          ) : null}
          {infoSuffix ? (
            <Text
              variant={TextVariant.BodyXs}
              color={TextColor.TextAlternative}
            >
              {infoSuffix}
            </Text>
          ) : null}
        </Box>
      ) : null}
    </BottomSheet>
  );
};

export default RecurringConfirmOrderSheet;
