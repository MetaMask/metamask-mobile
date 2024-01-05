/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import ValueListItem from '../../ValueList/ValueListItem/ValueListItem';
import TokenIcon from '../TokenIcon/TokenIcon';
import Text, { TextVariant, TextColor } from '../../Texts/Text';
import Icon, { IconName, IconColor, IconSize } from '../../Icons/Icon';

// Internal dependencies.
import styleSheet from './TokenListItem.styles';
import { TokenListItemProps } from './TokenListItem.types';

const TokenListItem: React.FC<TokenListItemProps> = ({
  style,
  primaryAmount,
  secondaryAmount,
  tokenSymbol,
  tokenName,
  tokenImageSource,
  isStake = false,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });

  const renderLabel = () => (
    <View style={styles.labelContainer}>
      <Text variant={TextVariant.BodyLGMedium}>{tokenSymbol}</Text>
      {isStake && (
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

  const renderEndAccessory = () => (
    <View style={styles.endAccessory}>
      <Text variant={TextVariant.BodyLGMedium}>{primaryAmount}</Text>
      {secondaryAmount && (
        <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
          {secondaryAmount}
        </Text>
      )}
    </View>
  );

  return (
    <ValueListItem
      style={styles.base}
      iconEl={
        <TokenIcon
          name={tokenName}
          imageSource={tokenImageSource}
          isHaloEnabled
          isIpfsGatewayCheckBypassed
        />
      }
      label={renderLabel()}
      description={tokenName}
      endAccessory={renderEndAccessory()}
      {...props}
    />
  );
};

export default TokenListItem;
