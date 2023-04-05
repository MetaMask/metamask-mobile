/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Button from '../../Buttons/Button';

// Internal dependencies.
import styleSheet from './BottomSheetFooter.styles';
import {
  BottomSheetFooterProps,
  ButtonsAlignment,
} from './BottomSheetFooter.types';

const BottomSheetFooter: React.FC<BottomSheetFooterProps> = ({
  style,
  buttonsAlignment = ButtonsAlignment.Horizontal,
  buttonPropsArray,
}) => {
  const { styles } = useStyles(styleSheet, { style, buttonsAlignment });

  return (
    <View style={styles.base}>
      {buttonPropsArray.map((buttonProp, index) => (
        <Button
          key={index}
          style={index > 0 && styles.subsequentButton}
          {...buttonProp}
        />
      ))}
    </View>
  );
};

export default BottomSheetFooter;
