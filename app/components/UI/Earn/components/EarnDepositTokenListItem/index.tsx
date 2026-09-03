import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import {
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useStyles } from '../../../../hooks/useStyles';
import { EarnTokenListItemProps } from './EarnDepositTokenListItem.types';
import { getNetworkImageSource } from '../../../../../util/networks';
import { EarnNetworkAvatar } from '../EarnNetworkAvatar';
import styleSheet from './EarnDepositTokenListItem.styles';

const resolveTextTypography = (
  text: EarnTokenListItemProps['secondaryText'],
  defaultVariant: TextVariant,
) => ({
  variant: text?.variant ?? defaultVariant,
  fontWeight:
    text?.fontWeight ?? (text?.variant ? undefined : FontWeight.Medium),
});

const EarnDepositTokenListItem = ({
  token,
  primaryText,
  secondaryText,
  onPress,
}: EarnTokenListItemProps) => {
  const { styles } = useStyles(styleSheet, {});

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(token)}
      testID="earn-token-list-item"
    >
      <View style={styles.left}>
        <BadgeWrapper
          position={BadgeWrapperPosition.BottomRight}
          badge={
            <BadgeNetwork
              twClassName="h-4 w-4 rounded bg-default"
              src={
                getNetworkImageSource({
                  chainId: token.chainId ?? '',
                }) as React.ComponentProps<typeof BadgeNetwork>['src']
              }
            />
          }
        >
          <EarnNetworkAvatar token={token} />
        </BadgeWrapper>
        <Text
          numberOfLines={1}
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          ellipsizeMode="tail"
          style={styles.assetName}
        >
          {token.name}
        </Text>
      </View>
      <View style={styles.right}>
        <Text
          {...resolveTextTypography(primaryText, TextVariant.BodyMd)}
          color={primaryText?.color}
        >
          {primaryText.value}
        </Text>
        {secondaryText?.value && (
          <Text
            {...resolveTextTypography(secondaryText, TextVariant.BodySm)}
            color={secondaryText?.color ?? TextColor.TextAlternative}
          >
            {secondaryText.value}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default EarnDepositTokenListItem;
