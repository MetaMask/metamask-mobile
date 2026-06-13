import React from 'react';
import { View } from 'react-native';
import {
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../locales/i18n';
import createStyles from './SheetActionView.styles';
import { SheetActionViewI } from './SheetActionView.types';

const SheetActionView = ({ onConfirm, onCancel }: SheetActionViewI) => {
  const styles = createStyles();
  return (
    <View style={styles.actionsContainer}>
      <Button
        onPress={onCancel}
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        style={styles.cancelButton}
      >
        {strings('action_view.cancel')}
      </Button>
      <Button
        onPress={onConfirm}
        variant={ButtonVariant.Primary}
        size={ButtonSize.Lg}
        style={styles.confirmButton}
      >
        {strings('action_view.confirm')}
      </Button>
    </View>
  );
};
export default SheetActionView;
