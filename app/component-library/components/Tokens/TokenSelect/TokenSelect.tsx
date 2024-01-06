/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import { ValueListItemProps } from '../../ValueList/ValueListItem/ValueListItem.types';
import { TokenListItemProps } from '../TokenListItem/TokenListItem.types';
import TokenIcon from '../TokenIcon/TokenIcon';
import Text, { TextVariant, TextColor } from '../../Texts/Text';
import Icon, { IconName, IconColor, IconSize } from '../../Icons/Icon';
import Select from '../../Selectables/Select/Select';

// Internal dependencies.
import styleSheet from './TokenSelect.styles';
import { TokenSelectProps } from './TokenSelect.types';

const TokenSelect: React.FC<TokenSelectProps> = ({
  style,
  value,
  options,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const convertTokenPropsToValueProps = (
    option: TokenListItemProps,
  ): ValueListItemProps => ({
    iconEl: (
      <TokenIcon
        name={option.tokenName}
        imageSource={option.tokenImageSource}
        isHaloEnabled
        isIpfsGatewayCheckBypassed
      />
    ),
    label: (
      <View style={styles.labelContainer}>
        <Text variant={TextVariant.BodyLGMedium}>{option.tokenSymbol}</Text>
        {option.isStake && (
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
    ),
    endAccessory: (
      <View style={styles.endAccessory}>
        <Text variant={TextVariant.BodyLGMedium}>{option.primaryAmount}</Text>
        {option.secondaryAmount && (
          <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
            {option.secondaryAmount}
          </Text>
        )}
      </View>
    ),
    ...option,
  });
  const convertedOptions = options.map(
    (option: TokenListItemProps): ValueListItemProps =>
      convertTokenPropsToValueProps(option),
  );
  const convertedValue = value ? convertTokenPropsToValueProps(value) : {};
  return (
    <Select
      style={styles.base}
      options={convertedOptions}
      value={value && convertedValue}
      {...props}
    />
  );
};

export default TokenSelect;
