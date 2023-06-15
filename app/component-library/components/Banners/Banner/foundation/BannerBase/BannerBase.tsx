/* eslint-disable react/prop-types */

// Third party dependencies.
import { noop } from 'lodash';
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Text from '../../../../Texts/Text';
import Button from '../../../../Buttons/Button';
import ButtonIcon from '../../../../Buttons/ButtonIcon';

// Internal dependencies.
import styleSheet from './BannerBase.styles';
import { BannerBaseProps } from './BannerBase.types';
import {
  DEFAULT_BANNERBASE_TITLE_TEXTVARIANT,
  DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT,
  DEFAULT_BANNERBASE_ACTIONBUTTON_VARIANT,
  DEFAULT_BANNERBASE_ACTIONBUTTON_SIZE,
  DEFAULT_BANNERBASE_CLOSEBUTTON_BUTTONICONVARIANT,
  DEFAULT_BANNERBASE_CLOSEBUTTON_BUTTONICONSIZE,
  DEFAULT_BANNERBASE_CLOSEBUTTON_ICONNAME,
  TESTID_BANNER_CLOSE_BUTTON_ICON,
} from './BannerBase.constants';

const BannerBase: React.FC<BannerBaseProps> = ({
  style,
  startAccessory,
  title,
  description,
  actionButtonProps,
  onClose,
  closeButtonProps,
  children,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style });
  const renderTitle = () =>
    typeof title === 'string' ? (
      <Text variant={DEFAULT_BANNERBASE_TITLE_TEXTVARIANT}>{title}</Text>
    ) : (
      { title }
    );
  const renderDescription = () =>
    typeof description === 'string' ? (
      <Text variant={DEFAULT_BANNERBASE_DESCRIPTION_TEXTVARIANT}>
        {description}
      </Text>
    ) : (
      { description }
    );

  return (
    <View style={styles.base} {...props}>
      <View style={styles.startAccessory}>{startAccessory}</View>
      <View style={styles.info}>
        {renderTitle()}
        {renderDescription()}
        {actionButtonProps && (
          <Button
            variant={DEFAULT_BANNERBASE_ACTIONBUTTON_VARIANT}
            size={DEFAULT_BANNERBASE_ACTIONBUTTON_SIZE}
            {...actionButtonProps}
          />
        )}
        {children}
      </View>
      {(onClose || closeButtonProps) && (
        <View style={styles.endAccessory}>
          <ButtonIcon
            testID={TESTID_BANNER_CLOSE_BUTTON_ICON}
            variant={DEFAULT_BANNERBASE_CLOSEBUTTON_BUTTONICONVARIANT}
            size={DEFAULT_BANNERBASE_CLOSEBUTTON_BUTTONICONSIZE}
            onPress={onClose || closeButtonProps?.onPress || noop}
            iconName={DEFAULT_BANNERBASE_CLOSEBUTTON_ICONNAME}
            {...closeButtonProps}
          />
        </View>
      )}
    </View>
  );
};

export default BannerBase;
