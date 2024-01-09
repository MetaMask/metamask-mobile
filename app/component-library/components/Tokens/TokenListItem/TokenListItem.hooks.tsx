/* eslint-disable import/prefer-default-export */
// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';
import { useStyles } from '../../../hooks';
import TokenIcon from '../TokenIcon/TokenIcon';
import Text, { TextVariant, TextColor } from '../../Texts/Text';
import Icon, { IconName, IconColor, IconSize } from '../../Icons/Icon';

// Internal dependencies.
import { TokenListItemProps } from './TokenListItem.types';
import styleSheet from './TokenListItem.styles';

const renderLabel = (styles: any, tokenListItemProps: TokenListItemProps) => (
  <View style={styles.labelContainer}>
    <Text variant={TextVariant.BodyLGMedium}>
      {tokenListItemProps.tokenSymbol}
    </Text>
    {tokenListItemProps.isStake && (
      <>
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Alternative}
          style={styles.stakeContainer}
        >
          •
        </Text>
        <Text
          variant={TextVariant.BodyLGMedium}
          color={TextColor.Primary}
          style={styles.stakeContainer}
        >
          Stake
        </Text>
        <Icon
          name={IconName.Plant}
          color={IconColor.Primary}
          size={IconSize.Sm}
        />
      </>
    )}
  </View>
);

const renderIconEl = (tokenListItemProps: TokenListItemProps) => (
  <TokenIcon
    name={tokenListItemProps.tokenName}
    imageSource={tokenListItemProps.tokenImageSource}
    isHaloEnabled
    isIpfsGatewayCheckBypassed
  />
);

const renderEndAccessory = (
  styles: any,
  tokenListItemProps: TokenListItemProps,
) => (
  <View style={styles.endAccessory}>
    <Text variant={TextVariant.BodyLGMedium}>
      {tokenListItemProps.primaryAmount}
    </Text>
    {tokenListItemProps.secondaryAmount && (
      <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
        {tokenListItemProps.secondaryAmount}
      </Text>
    )}
  </View>
);

export const useTokenListItemTemplate = (
  tokenListItemProps: TokenListItemProps,
): ListItemProps => {
  const { styles } = useStyles(styleSheet, {});
  return {
    ...tokenListItemProps,
    iconEl: renderIconEl(tokenListItemProps),
    label: renderLabel(styles, tokenListItemProps),
    description: tokenListItemProps.tokenName,
    endAccessory: renderEndAccessory(styles, tokenListItemProps),
  };
};

export const useTokenListTemplate = (
  tokenListProps: TokenListItemProps[],
): ListItemProps[] => {
  const { styles } = useStyles(styleSheet, {});
  return tokenListProps.map((tokenListItemProps: TokenListItemProps) => ({
    ...tokenListItemProps,
    iconEl: renderIconEl(tokenListItemProps),
    label: renderLabel(styles, tokenListItemProps),
    description: tokenListItemProps.tokenName,
    endAccessory: renderEndAccessory(styles, tokenListItemProps),
  }));
};
