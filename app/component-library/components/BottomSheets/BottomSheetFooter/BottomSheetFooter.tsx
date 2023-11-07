/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Button from '../../Buttons/Button';

// Internal dependencies.
import styleSheet from './BottomSheetFooter.styles';
import { BottomSheetFooterProps } from './BottomSheetFooter.types';
import {
  DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  TESTID_BOTTOMSHEETFOOTER,
  TESTID_BOTTOMSHEETFOOTER_BUTTON,
  TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT,
} from './BottomSheetFooter.constants';

const BottomSheetFooter: React.FC<BottomSheetFooterProps> = ({
  style,
  buttonsAlignment = DEFAULT_BOTTOMSHEETFOOTER_BUTTONSALIGNMENT,
  buttonPropsArray,
}) => {
  const { styles } = useStyles(styleSheet, { style, buttonsAlignment });

  return (
    <View style={styles.base} testID={TESTID_BOTTOMSHEETFOOTER}>
      {buttonPropsArray.map((buttonProp, index) => (
        <Button
          key={index}
          style={index > 0 ? styles.subsequentButton : styles.button}
          testID={
            index > 0
              ? TESTID_BOTTOMSHEETFOOTER_BUTTON_SUBSEQUENT
              : TESTID_BOTTOMSHEETFOOTER_BUTTON
          }
          {...buttonProp}
        />
      ))}
    </View>
  );
};

export default BottomSheetFooter;
