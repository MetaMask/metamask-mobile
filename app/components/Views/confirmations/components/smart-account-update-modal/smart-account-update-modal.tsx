import React, { useCallback, useState } from 'react';
import { View } from 'react-native';

import { strings } from '../../../../../../locales/i18n';
import Engine from '../../../../../core/Engine';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../../component-library/components/Buttons/Button';
import BottomSheet from '../../../../../component-library/components/BottomSheets/BottomSheet';
import { useStyles } from '../../../../hooks/useStyles';
import { SmartAccountUpdateContent } from '../smart-account-update-content';
import styleSheet from './smart-account-update-modal.styles';
import { SmartAccountUpdateSuccess } from './smart-account-update-success';

export const SmartAccountUpdateModal = () => {
  const { PreferencesController } = Engine.context;
  const [acknowledged, setAcknowledged] = useState(false);
  const { styles } = useStyles(styleSheet, {});

  const onUpdate = useCallback(() => {
    PreferencesController.setSmartAccountOptIn(true);
    setAcknowledged(true);
  }, [setAcknowledged]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <BottomSheet style={styles.bottomSheet}>
      {acknowledged && <SmartAccountUpdateSuccess />}
      {!acknowledged && (
        <View style={styles.wrapper}>
          <SmartAccountUpdateContent />
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            style={styles.button}
            label={strings('confirm.7702_functionality.useSmartAccount')}
            onPress={onUpdate}
          />
        </View>
      )}
    </BottomSheet>
  );
};
