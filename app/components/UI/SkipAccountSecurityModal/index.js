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
import { useTheme } from '../../../util/theme';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { SkipAccountSecurityModalSelectorsIDs } from './SkipAccountSecurityModal.testIds';
import BottomSheet from '../../../component-library/components/BottomSheets/BottomSheet';
import Checkbox from '../../../component-library/components/Checkbox';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useNavigation } from '@react-navigation/native';

const createStyles = (colors) =>
  StyleSheet.create({
    imageWarning: {
      alignSelf: 'center',
      color: colors.error.default,
      marginBottom: 16,
    },
    skipModalContainer: {
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      width: '100%',
    },
    skipModalActionButtons: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 16,
      marginTop: 16,
    },
    skipModalCheckbox: {
      height: 18,
      width: 18,
      marginRight: 12,
      marginTop: 3,
    },
    ctaContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: 16,
      marginTop: 24,
      marginBottom: Platform.select({
        ios: 8,
        macos: 8,
        default: 16,
      }),
    },
    button: {
      flex: 1,
    },
    skipButton: {
      flex: 1,
      backgroundColor: colors.error.default,
    },
  });

const SkipAccountSecurityModal = ({ route }) => {
  const sheetRef = useRef(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const navigation = useNavigation();

  const [skipCheckbox, setSkipCheckbox] = useState(false);

  const toggleSkipCheckbox = () => {
    setSkipCheckbox(!skipCheckbox);
  };

  const onConfirmAction = () => {
    navigation.goBack();
    if (route?.params?.onConfirm) {
      route.params.onConfirm();
    }
  };

  const onCancelAction = () => {
    navigation.goBack();
    if (route?.params?.onCancel) {
      route.params.onCancel();
    }
  };

  return (
    <BottomSheet ref={sheetRef}>
      <View style={styles.skipModalContainer}>
        <Icon
          name={IconName.Danger}
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

        <View style={styles.ctaContainer}>
          <Button
            onPress={onCancelAction}
            label={strings('account_backup_step_1.skip_button_cancel')}
            type={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            style={styles.button}
            testID={SkipAccountSecurityModalSelectorsIDs.CANCEL_BUTTON}
          />
          <Button
            onPress={onConfirmAction}
            label={strings('account_backup_step_1.skip_button_confirm')}
            type={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            style={styles.skipButton}
            isDisabled={!skipCheckbox}
            testID={SkipAccountSecurityModalSelectorsIDs.SKIP_BUTTON}
          />
        </View>
      </View>
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
