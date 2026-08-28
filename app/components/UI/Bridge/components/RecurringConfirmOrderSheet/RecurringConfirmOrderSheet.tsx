import React, { useCallback, useMemo, useRef, type ReactNode } from 'react';
import { Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeWrapper,
  BadgeWrapperPosition,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
  ButtonIconSize,
  IconName,
  Text,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { DiscountType } from '@metamask/bridge-controller';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import {
  selectDestToken,
  selectRecurringRepeatCount,
  selectSlippage,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { getNetworkImageSource } from '../../../../../util/networks';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useFeeDisclaimer } from '../../hooks/useFeeDisclaimer';
import type { BridgeToken } from '../../types';
import { formatMinimumReceived } from '../../utils/currencyUtils';
import { getTokenImageSource } from '../../utils';
import { multiplyAmountByCount } from '../../utils/recurringConfirmTotals';
import {
  parsePositiveInteger,
  RECURRING_MAX_DURATION_DAYS,
} from '../../utils/recurringSchedule';
import { getNativeSourceToken } from '../../utils/tokenUtils';
import { getSlippageDisplayValue } from '../SlippageModal/utils';
import RewardsVipBadge from '../../../Rewards/components/RewardsVipBadge';
import { RewardsDiscountBadge } from '../../../Rewards/components/RewardsDiscountBadge';
import { RecurringConfirmOrderSheetSelectorsIDs } from './RecurringConfirmOrderSheet.testIds';
import type { RecurringConfirmOrderSheetProps } from './RecurringConfirmOrderSheet.types';

const QUOTE_VALUE_SKELETON_WIDTH = 72;
const QUOTE_VALUE_SKELETON_HEIGHT = 20;

const NETWORK_BADGE_SIZE = 10;

function TokenAvatar({
  token,
  size,
}: {
  token: BridgeToken;
  size: AvatarTokenSize;
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
      <AvatarToken name={token.symbol} src={tokenImageSource} size={size} />
    </BadgeWrapper>
  );
}

function ConfirmOrderRow({
  label,
  value,
  testID,
  trailing,
  isLoading,
  skeletonTestID,
}: {
  label: string;
  value: string;
  testID: string;
  trailing?: ReactNode;
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
      <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
        {label}
      </Text>
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
  isVisible,
  onClose,
}: RecurringConfirmOrderSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const repeatCount = useSelector(selectRecurringRepeatCount);
  const slippage = useSelector(selectSlippage);
  const { activeQuote, destTokenAmount, formattedQuoteData, isLoading } =
    useBridgeQuoteDataContext();
  const { discountBadge, infoText, infoSuffix, baseFeePercentage } =
    useFeeDisclaimer({ activeQuote });
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

  const expiresAfter = `${RECURRING_MAX_DURATION_DAYS} ${strings('bridge.recurring.unit_plural.day')}`;

  const nativeToken = useMemo(
    () =>
      sourceToken?.chainId
        ? getNativeSourceToken(sourceToken.chainId)
        : undefined,
    [sourceToken?.chainId],
  );
  const nativeTokenImageSource = nativeToken
    ? getTokenImageSource(
        nativeToken.symbol,
        nativeToken.image,
        nativeToken.address,
        nativeToken.chainId,
      )
    : undefined;

  const closeSheet = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleSlippagePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SWAP_DEFAULT_SLIPPAGE_MODAL,
      params: {
        sourceChainId: sourceToken?.chainId,
        destChainId: destToken?.chainId,
      },
    });
  }, [destToken?.chainId, navigation, sourceToken?.chainId]);

  if (!isVisible) {
    return null;
  }

  return (
    <BottomSheet
      ref={sheetRef}
      testID={RecurringConfirmOrderSheetSelectorsIDs.SHEET}
      onClose={onClose}
    >
      <BottomSheetHeader
        onClose={closeSheet}
        closeButtonProps={{
          testID: RecurringConfirmOrderSheetSelectorsIDs.CLOSE_BUTTON,
        }}
      >
        {strings('bridge.recurring.confirm_title')}
      </BottomSheetHeader>
      <Box paddingBottom={2}>
        <ConfirmOrderRow
          label={strings('bridge.recurring.paying_all_orders')}
          value={payingAllOrders}
          testID={RecurringConfirmOrderSheetSelectorsIDs.PAYING_ALL_ORDERS}
          trailing={
            sourceToken ? (
              <TokenAvatar token={sourceToken} size={AvatarTokenSize.Sm} />
            ) : undefined
          }
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.paying_per_order')}
          value={payingPerOrder}
          testID={RecurringConfirmOrderSheetSelectorsIDs.PAYING_PER_ORDER}
          trailing={
            sourceToken ? (
              <TokenAvatar token={sourceToken} size={AvatarTokenSize.Sm} />
            ) : undefined
          }
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.receiving')}
          value={destToken?.symbol ?? '--'}
          testID={RecurringConfirmOrderSheetSelectorsIDs.RECEIVING}
          trailing={
            destToken ? (
              <TokenAvatar token={destToken} size={AvatarTokenSize.Sm} />
            ) : undefined
          }
        />
        <Box twClassName="mx-4 my-2 h-px bg-muted" />
        <ConfirmOrderRow
          label={strings('bridge.recurring.est_receiving_per_order')}
          value={estReceivingPerOrder}
          testID={RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER}
          isLoading={showQuoteSkeletons}
          skeletonTestID={
            RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_PER_ORDER_SKELETON
          }
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.est_receiving_all_orders')}
          value={estReceivingAllOrders}
          testID={
            RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS
          }
          isLoading={showQuoteSkeletons}
          skeletonTestID={
            RecurringConfirmOrderSheetSelectorsIDs.EST_RECEIVING_ALL_ORDERS_SKELETON
          }
        />
        <ConfirmOrderRow
          label={strings('bridge.recurring.expires_after')}
          value={expiresAfter}
          testID={RecurringConfirmOrderSheetSelectorsIDs.EXPIRES_AFTER}
        />
        <Box twClassName="mx-4 my-2 h-px bg-muted" />
        <ConfirmOrderRow
          label={strings('bridge.recurring.slippage_all_orders')}
          value={getSlippageDisplayValue(slippage)}
          testID={RecurringConfirmOrderSheetSelectorsIDs.SLIPPAGE}
          trailing={
            <ButtonIcon
              iconName={IconName.Edit}
              size={ButtonIconSize.Sm}
              onPress={handleSlippagePress}
              testID={RecurringConfirmOrderSheetSelectorsIDs.SLIPPAGE_EDIT}
            />
          }
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
              <AvatarToken
                name={nativeToken.symbol}
                src={nativeTokenImageSource}
                size={AvatarTokenSize.Xs}
              />
            ) : undefined
          }
        />
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          children: strings('bridge.recurring.confirm'),
          onPress: closeSheet,
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
          {discountBadge?.type === DiscountType.VIP ? (
            <RewardsVipBadge />
          ) : null}
          {discountBadge && discountBadge.type !== DiscountType.VIP ? (
            <RewardsDiscountBadge label={discountBadge.label} />
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
