import React from 'react';
import { Pressable } from 'react-native';
import {
  Box,
  BoxAlignItems,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { TransactionMeta } from '@metamask/transaction-controller';
import { getNetworkImageSource } from '../../../../../util/networks';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import {
  BadgeAnchorElementShape,
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import { useMoneyTransactionDisplayInfo } from '../../hooks/useMoneyTransactionDisplayInfo';
import { MoneyActivityItemTestIds } from './MoneyActivityItem.testIds';

export interface MoneyActivityItemProps {
  tx: TransactionMeta;
  moneyAddress: string | undefined;
  onPress?: (transactionId: string) => void;
  /** When true, shows the chain network badge on the token avatar. Defaults to false. */
  showNetworkBadge?: boolean;
}

const MoneyActivityItem = ({
  tx,
  moneyAddress,
  onPress,
  showNetworkBadge = false,
}: MoneyActivityItemProps) => {
  const tw = useTailwind();

  const display = useMoneyTransactionDisplayInfo(tx, moneyAddress);

  const networkImageSource = showNetworkBadge
    ? getNetworkImageSource({ chainId: tx.chainId })
    : undefined;

  // use the token's own image URI, or the source chain's network icon, or the mUSD icon
  const tokenAvatarImageSource = useMemo(() => {
    if (display.sourceTokenImage) {
      return { uri: display.sourceTokenImage };
    }
    if (display.sourceTokenChainId) {
      return getNetworkImageSource({ chainId: display.sourceTokenChainId });
    }
    return MUSD_TOKEN.imageSource;
  }, [display.sourceTokenImage, display.sourceTokenChainId]);

  const amountColor = display.isIncoming
    ? TextColor.SuccessDefault
    : TextColor.TextDefault;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ? () => onPress(tx.id) : undefined}
      testID={`${MoneyActivityItemTestIds.ROW}-${tx.id}`}
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
          <AvatarToken
            name={display.sourceTokenSymbol ?? MUSD_TOKEN.name}
            imageSource={tokenAvatarImageSource}
            size={AvatarSize.Lg}
          />
        </BadgeWrapper>
      ) : (
        <Box twClassName="self-center">
          <AvatarToken
            name={display.sourceTokenSymbol ?? MUSD_TOKEN.name}
            imageSource={tokenAvatarImageSource}
            size={AvatarSize.Lg}
          />
        </Box>
      )}
      <Box twClassName="min-w-0 flex-1 gap-0.5">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextDefault}
          numberOfLines={1}
        >
          {display.label}
        </Text>
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
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          color={amountColor}
          twClassName="text-right"
        >
          {display.primaryAmount}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          fontWeight={FontWeight.Medium}
          color={TextColor.TextAlternative}
          twClassName="text-right"
        >
          {display.fiatAmount}
        </Text>
      </Box>
    </Pressable>
  );
};

export default MoneyActivityItem;
