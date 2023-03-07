/* eslint-disable react/prop-types */

// Third party dependencies.
import { noop } from 'lodash';
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Text from '../../../../Texts/Text';
import Button, { ButtonSize, ButtonVariants } from '../../../../Buttons/Button';
import ButtonIcon, { ButtonIconVariants } from '../../../../Buttons/ButtonIcon';
import { IconName } from '../../../../Icons/Icon';

// Internal dependencies.
import styleSheet from './BannerBase.styles';
import { BannerBaseProps } from './BannerBase.types';
import {
  TOKEN_BANNERBASE_TITLE_TEXTVARIANT,
  TOKEN_BANNERBASE_DESCRIPTION_TEXTVARIANT,
  TOKEN_BANNERBASE_CLOSEBUTTON_BUTTONICONSIZE,
} from './BannerBase.constants';

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
          <Text variant={TOKEN_BANNERBASE_TITLE_TEXTVARIANT} {...titleProps}>
            {title}
          </Text>
        )}
        {description && (
          <Text variant={TOKEN_BANNERBASE_DESCRIPTION_TEXTVARIANT}>
            {description}
          </Text>
        )}
        {descriptionEl && { descriptionEl }}
        {(actionButtonLabel || actionButtonProps) && (
          <Button
            variant={ButtonVariants.Link}
            size={ButtonSize.Auto}
            label={actionButtonLabel || actionButtonProps?.label || ''}
            onPress={actionButtonOnPress || actionButtonProps?.onPress || noop}
            {...actionButtonProps}
          />
        )}
      </View>
      {(onClose || closeButtonProps) && (
        <View style={styles.endAccessory}>
          <ButtonIcon
            variant={ButtonIconVariants.Secondary}
            size={TOKEN_BANNERBASE_CLOSEBUTTON_BUTTONICONSIZE}
            onPress={onClose || closeButtonProps?.onPress || noop}
            iconName={IconName.Close}
            {...closeButtonProps}
          />
        </View>
      )}
    </View>
  );
};

export default BannerBase;
