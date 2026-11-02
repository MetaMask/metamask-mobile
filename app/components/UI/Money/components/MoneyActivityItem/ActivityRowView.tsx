import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  BadgeWrapperPositionAnchorShape,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  SensitiveText,
  SensitiveTextLength,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { Hex } from '@metamask/utils';
import { getNetworkImageSource } from '../../../../../util/networks';
import type { MoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import PendingSpinner from '../PendingSpinner/PendingSpinner';
import { MoneyActivityItemTestIds } from './MoneyActivityItem.testIds';

export interface ActivityRowViewProps {
  readonly id: string;
  readonly display: MoneyTransactionDisplayInfo;
  readonly chainId?: Hex;
  readonly onPress?: (id: string) => void;
  readonly showNetworkBadge?: boolean;
  /** Whether the crypto/fiat amounts should be masked. */
  readonly privacyMode?: boolean;
}

interface ActivityRowIconProps {
  readonly icon: MoneyTransactionDisplayInfo['icon'];
  readonly chainId?: Hex;
  readonly showNetworkBadge: boolean;
}

function ActivityRowIcon({
  icon,
  chainId,
  showNetworkBadge,
}: ActivityRowIconProps) {
  const tw = useTailwind();
  const networkImageSource = useMemo(
    () =>
      showNetworkBadge && chainId
        ? getNetworkImageSource({ chainId })
        : undefined,
    [chainId, showNetworkBadge],
  );
  const avatar = (
    <AvatarIcon
      iconName={icon}
      severity={AvatarIconSeverity.Neutral}
      size={AvatarIconSize.Lg}
      accessibilityLabel={icon}
      testID={MoneyActivityItemTestIds.ICON}
    />
  );

  if (!showNetworkBadge) {
    return <Box twClassName="self-center">{avatar}</Box>;
  }

  return (
    <BadgeWrapper
      positionAnchorShape={BadgeWrapperPositionAnchorShape.Circular}
      position={BadgeWrapperPosition.BottomRight}
      style={tw.style('self-center')}
      badge={
        <BadgeNetwork
          src={
            networkImageSource as React.ComponentProps<
              typeof BadgeNetwork
            >['src']
          }
          testID={MoneyActivityItemTestIds.NETWORK_BADGE}
        />
      }
    >
      {avatar}
    </BadgeWrapper>
  );
}

interface ActivityRowLabelProps {
  readonly display: MoneyTransactionDisplayInfo;
}

function ActivityRowLabel({ display }: ActivityRowLabelProps) {
  const isFailed = display.status === 'failed';
  const isPending = display.status === 'pending';

  return (
    <Box twClassName="min-w-0 flex-1 gap-0.5">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={isFailed ? TextColor.ErrorDefault : TextColor.TextDefault}
          numberOfLines={1}
          testID={MoneyActivityItemTestIds.LABEL}
          twClassName="shrink"
        >
          {display.label}
        </Text>
        {isPending ? (
          <PendingSpinner testID={MoneyActivityItemTestIds.PENDING_SPINNER} />
        ) : null}
      </Box>
      {display.description ? (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          testID={MoneyActivityItemTestIds.DESCRIPTION}
        >
          {display.description}
        </Text>
      ) : null}
    </Box>
  );
}

interface ActivityRowAmountsProps {
  readonly display: MoneyTransactionDisplayInfo;
  readonly privacyMode: boolean;
}

function ActivityRowAmounts({ display, privacyMode }: ActivityRowAmountsProps) {
  const amountColor =
    display.status === 'failed'
      ? TextColor.TextAlternative
      : display.isIncoming
        ? TextColor.SuccessDefault
        : TextColor.TextDefault;

  return (
    <Box alignItems={BoxAlignItems.End}>
      {display.showPrimaryAmount ? (
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={amountColor}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
          twClassName={
            display.isPrimaryAmountPending
              ? 'text-right opacity-30'
              : 'text-right'
          }
          testID={MoneyActivityItemTestIds.PRIMARY_AMOUNT}
        >
          {display.primaryAmount}
        </SensitiveText>
      ) : null}
      {display.pendingStatusLabel ? (
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          numberOfLines={1}
          testID={MoneyActivityItemTestIds.PENDING_STATUS}
        >
          {display.pendingStatusLabel}
        </Text>
      ) : display.fiatAmount || !display.showPrimaryAmount ? (
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={
            display.isFiatAmountMuted ? TextColor.TextAlternative : amountColor
          }
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
          twClassName="text-right"
          testID={MoneyActivityItemTestIds.FIAT_AMOUNT}
        >
          {display.fiatAmount}
        </SensitiveText>
      ) : null}
    </Box>
  );
}

const ActivityRowView = ({
  id,
  display,
  chainId,
  onPress,
  showNetworkBadge = false,
  privacyMode = false,
}: ActivityRowViewProps) => {
  const tw = useTailwind();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ? () => onPress(id) : undefined}
      testID={`${MoneyActivityItemTestIds.ROW}-${id}`}
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center gap-4 px-4 py-4',
          pressed && onPress !== undefined && 'bg-pressed',
        )
      }
    >
      <ActivityRowIcon
        icon={display.icon}
        chainId={chainId}
        showNetworkBadge={showNetworkBadge}
      />
      <ActivityRowLabel display={display} />
      <ActivityRowAmounts display={display} privacyMode={privacyMode} />
    </Pressable>
  );
};

export default React.memo(ActivityRowView);
