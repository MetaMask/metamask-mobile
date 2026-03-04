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

/**
 * @deprecated Please update your code to use `BottomSheetFooter` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BottomSheets/BottomSheetFooter/README.md}
 * @since @metamask/design-system-react-native@0.7.0
 */
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
