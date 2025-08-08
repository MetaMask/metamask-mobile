/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import HeaderBase from '../../HeaderBase';
import ButtonIcon from '../../Buttons/ButtonIcon';
import { IconName, IconColor } from '../../Icons/Icon';
import Text from '../../Texts/Text';
import { TextVariant } from '../../Texts/Text/Text.types';

// Internal dependencies.
import styleSheet from './BottomSheetHeader.styles';
import {
  BottomSheetHeaderProps,
  BottomSheetHeaderAlignment,
} from './BottomSheetHeader.types';

const BottomSheetHeader: React.FC<BottomSheetHeaderProps> = ({
  style,
  children,
  onBack,
  onClose,
  alignment = BottomSheetHeaderAlignment.Center,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, { style, alignment });
  const startAccessory = onBack && (
    <ButtonIcon
      iconName={IconName.ArrowLeft}
      iconColor={IconColor.Default}
      onPress={onBack}
    />
  );

  const endAccessory = onClose && (
    <ButtonIcon
      iconName={IconName.Close}
      iconColor={IconColor.Default}
      onPress={onClose}
    />
  );

  // For left-aligned layout, we need custom rendering
  if (alignment === BottomSheetHeaderAlignment.Left) {
    return (
      <View style={styles.base}>
        <View style={styles.leftAlignedContainer}>
          {startAccessory && (
            <View style={styles.leftAccessory}>{startAccessory}</View>
          )}
          <View style={styles.leftAlignedTitleWrapper}>
            {typeof children === 'string' ? (
              <Text
                variant={TextVariant.HeadingMD}
                style={styles.leftAlignedTitle}
              >
                {children}
              </Text>
            ) : (
              children
            )}
          </View>
          {endAccessory && (
            <View style={styles.rightAccessory}>{endAccessory}</View>
          )}
        </View>
      </View>
    );
  }

  // Default center-aligned layout using HeaderBase
  return (
    <HeaderBase
      style={styles.base}
      startAccessory={startAccessory}
      endAccessory={endAccessory}
      {...props}
    >
      {children}
    </HeaderBase>
  );
};

export default BottomSheetHeader;
