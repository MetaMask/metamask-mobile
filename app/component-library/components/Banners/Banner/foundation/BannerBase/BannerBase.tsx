/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Text, { TextVariant } from '../../../../Texts/Text';
import Button, { ButtonSize, ButtonVariants } from '../../../../Buttons/Button';
import ButtonIcon, { ButtonIconVariants } from '../../../../Buttons/ButtonIcon';
import { IconName } from '../../../../Icon';

// Internal dependencies.
import styleSheet from './BannerBase.styles';
import { BannerBaseProps } from './BannerBase.types';

const BannerBase: React.FC<BannerBaseProps> = ({
  style,
  startAccessory,
  title,
  titleProps,
  description,
  descriptionEl,
  actionButtonLabel,
  actionButtonOnPress,
  actionButtonProps,
  onClose,
  closeButtonProps,
}) => {
  const { styles } = useStyles(styleSheet, { style });
  return (
    <View style={styles.base}>
      <View style={styles.startAccessory}>{startAccessory}</View>
      <View style={styles.info}>
        {(title || titleProps) && (
          <Text variant={TextVariant.BodyLGMedium} {...titleProps}>
            {title}
          </Text>
        )}
        {description && <Text variant={TextVariant.BodyMD}>{description}</Text>}
        {descriptionEl && { descriptionEl }}
        {(actionButtonLabel || actionButtonProps) && (
          <Button
            variant={ButtonVariants.Link}
            size={ButtonSize.Auto}
            label={actionButtonLabel || actionButtonProps.label}
            onPress={actionButtonOnPress || actionButtonProps.onPress}
            {...actionButtonProps}
          />
        )}
      </View>
      {(onClose || closeButtonProps) && (
        <View style={styles.endAccessory}>
          <ButtonIcon
            variant={ButtonIconVariants.Secondary}
            onPress={onClose || closeButtonProps.onPress}
            iconName={IconName.CloseOutline}
            {...closeButtonProps}
          />
        </View>
      )}
    </View>
  );
};

export default BannerBase;
