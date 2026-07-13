import React, { useMemo } from 'react';
import { Pressable } from 'react-native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
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
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import {
  BadgeAnchorElementShape,
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import type { MoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import PendingSpinner from '../PendingSpinner/PendingSpinner';
import { MoneyActivityItemTestIds } from './MoneyActivityItem.testIds';

export interface ActivityRowViewProps {
  id: string;
  display: MoneyTransactionDisplayInfo;
  chainId?: Hex;
  onPress?: (id: string) => void;
  showNetworkBadge?: boolean;
  /** Whether the crypto/fiat amounts should be masked. */
  privacyMode?: boolean;
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

  const isFailed = display.status === 'failed';
  const isPending = display.status === 'pending';

  const networkImageSource = useMemo(
    () =>
      showNetworkBadge && chainId
        ? getNetworkImageSource({ chainId })
        : undefined,
    [chainId, showNetworkBadge],
  );

  const amountColor = isFailed
    ? TextColor.TextAlternative
    : display.isIncoming
      ? TextColor.SuccessDefault
      : TextColor.TextDefault;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ? () => onPress(id) : undefined}
      testID={`${MoneyActivityItemTestIds.ROW}-${id}`}
      style={({ pressed }) =>
        tw.style(
          'w-full flex-row items-center gap-4 px-4 py-3',
          pressed && onPress !== undefined && 'bg-pressed',
        )
      }
    >
      {showNetworkBadge ? (
        <BadgeWrapper
          anchorElementShape={BadgeAnchorElementShape.Circular}
          badgePosition={BadgePosition.BottomRight}
          style={tw.style('self-center')}
          badgeElement={
            <Badge
              variant={BadgeVariant.Network}
              imageSource={networkImageSource}
              size={AvatarSize.Sm}
            />
          }
        >
          <AvatarIcon
            iconName={display.icon}
            severity={AvatarIconSeverity.Neutral}
            size={AvatarIconSize.Lg}
            testID={MoneyActivityItemTestIds.ICON}
          />
        </BadgeWrapper>
      ) : (
        <Box twClassName="self-center">
          <AvatarIcon
            iconName={display.icon}
            severity={AvatarIconSeverity.Neutral}
            size={AvatarIconSize.Lg}
            testID={MoneyActivityItemTestIds.ICON}
          />
        </Box>
      )}
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
          >
            {display.description}
          </Text>
        ) : null}
      </Box>
      <Box alignItems={BoxAlignItems.End} twClassName="shrink-0 gap-0.5">
        <SensitiveText
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={amountColor}
          isHidden={privacyMode}
          length={SensitiveTextLength.Medium}
          twClassName="text-right"
          testID={MoneyActivityItemTestIds.PRIMARY_AMOUNT}
        >
          {display.primaryAmount}
        </SensitiveText>
        <SensitiveText
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          isHidden={privacyMode}
          length={SensitiveTextLength.Short}
          twClassName="text-right"
          testID={MoneyActivityItemTestIds.FIAT_AMOUNT}
        >
          {display.fiatAmount}
        </SensitiveText>
      </Box>
    </Pressable>
  );
};

export default ActivityRowView;
