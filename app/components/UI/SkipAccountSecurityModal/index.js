import React, { useState, useRef } from 'react';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';
import { View, StyleSheet, Platform } from 'react-native';
import { strings } from '../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import PropTypes from 'prop-types';
import { fontStyles } from '../../../styles/common';
import { useTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { SkipAccountSecurityModalSelectorsIDs } from '../../../../e2e/selectors/Onboarding/SkipAccountSecurityModal.selectors';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import Checkbox from '../../../component-library/components/Checkbox';
import ActionContent from '../ActionModal/ActionContent';

const createStyles = (colors) =>
  StyleSheet.create({
    imageWarning: {
      alignSelf: 'center',
      color: colors.error.default,
    },
    modalNoBorder: {
      borderTopWidth: 0,
    },
    skipTitle: {
      fontSize: 24,
      marginTop: 12,
      marginBottom: 16,
      color: colors.text.default,
      textAlign: 'center',
      ...fontStyles.bold,
    },
    skipModalContainer: {
      flex: 1,
      flexDirection: 'column',
      marginTop: 24,
      justifyContent: 'center',
      alignItems: 'center',
      gap: 16,
    },
    skipModalXButton: {
      alignItems: 'flex-end',
    },
    skipModalXIcon: {
      fontSize: 16,
      color: colors.text.default,
    },
    skipModalActionButtons: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
    },
    skipModalCheckbox: {
      height: 18,
      width: 18,
      marginRight: 12,
      marginTop: 3,
    },
    skipModalText: {
      flex: 1,
      ...fontStyles.normal,
      lineHeight: 20,
      fontSize: 14,
      paddingHorizontal: 10,
      color: colors.text.default,
    },
  });

const SkipAccountSecurityModal = ({ route }) => {
  const sheetRef = useRef(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [skipCheckbox, setSkipCheckbox] = useState(false);

  const toggleSkipCheckbox = () => {
    setSkipCheckbox(!skipCheckbox);
  };

  const onConfirmAction = () => {
    if (route && route.params && route.params.onConfirm) {
      route.params.onConfirm();
      // sheetRef.current?.onCloseBottomSheet?.();
    }
  };

  const onCancelAction = () => {
    if (route && route.params && route.params.onCancel) {
      route.params.onCancel();
      sheetRef.current?.onCloseBottomSheet?.();
    }
  };

  return (
    <BottomSheet ref={sheetRef}>
      <ActionContent
        cancelTestID={SkipAccountSecurityModalSelectorsIDs.CANCEL_BUTTON}
        confirmTestID={SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON}
        confirmText={strings('account_backup_step_1.skip_button_confirm')}
        cancelText={strings('account_backup_step_1.skip_button_cancel')}
        confirmButtonMode={'danger'}
        cancelButtonMode={'normal'}
        actionContainerStyle={styles.modalNoBorder}
        onCancelPress={onCancelAction}
        confirmDisabled={!skipCheckbox}
        onConfirmPress={onConfirmAction}
      >
        <View style={styles.skipModalContainer}>
          <Icon
            name={IconName.DangerSolid}
            size={IconSize.Lg}
            style={styles.imageWarning}
            {...generateTestId(Platform, 'skip-backup-warning')}
          />
          <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
            {strings('account_backup_step_1.skip_title')}
          </Text>
          <View
            style={styles.skipModalActionButtons}
            testID={SkipAccountSecurityModalSelectorsIDs.CONTAINER}
          >
            <Checkbox
              style={styles.skipModalCheckbox}
              isChecked={skipCheckbox}
              onPress={toggleSkipCheckbox}
              testID={
                SkipAccountSecurityModalSelectorsIDs.iOS_SKIP_BACKUP_BUTTON_ID
              }
            />
            <Text
              onPress={toggleSkipCheckbox}
              variant={TextVariant.BodySM}
              color={TextColor.Default}
              testID={
                SkipAccountSecurityModalSelectorsIDs.ANDROID_SKIP_BACKUP_BUTTON_ID
              }
            >
              {strings('account_backup_step_1.skip_check')}
            </Text>
          </View>
        </View>
      </ActionContent>
    </BottomSheet>
  );
};

const propTypes = {
  route: PropTypes.shape({
    params: PropTypes.shape({
      onConfirm: PropTypes.func,
      onCancel: PropTypes.func,
    }),
  }),
};

SkipAccountSecurityModal.propTypes = propTypes;

export default SkipAccountSecurityModal;
