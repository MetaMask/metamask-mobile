import React, { useRef } from 'react';
import { View } from 'react-native';
import SheetBottom from '../../../component-library/components/Sheet/SheetBottom';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { ButtonSecondaryVariants } from '../../../component-library/components/Buttons/Button/variants/ButtonSecondary';
import { ButtonPrimaryVariants } from '../../../component-library/components/Buttons/Button/variants/ButtonPrimary';

import { useStyles } from '../../../component-library/hooks';
import styleSheet from './SheetBottomConfirmation.styles';

const SheetBottomConfirmation = ({ confirmLabel, cancelLabel }) => {
  const test = '';
  const { styles } = useStyles(styleSheet, {});
  const bottomSheetRef = useRef<SheetBottomRef | null>(null);
  return (
    <SheetBottom isInteractable={false} ref={bottomSheetRef}>
      <View>
        <Button
          variant={ButtonVariants.Secondary}
          buttonSecondaryVariants={ButtonSecondaryVariants.Normal}
          onPress={() => {}}
          label={cancelLabel || strings('confirmation_modal.cancel_cta')}
          size={ButtonSize.Lg}
          style={{ flex: 1 }}
        />
        <View /* style={styles.buttonDivider} */ />
        <Button
          variant={ButtonVariants.Primary}
          //    testID={BUTTON_TEST_ID_BY_VARIANT[variant]}
          buttonPrimaryVariants={ButtonPrimaryVariants.Normal}
          onPress={() => {}}
          label={confirmLabel || strings('confirmation_modal.confirm_cta')}
          size={ButtonSize.Lg}
          style={{ flex: 1 }}
        />
      </View>
    </SheetBottom>
  );
};
export default SheetBottomConfirmation;
