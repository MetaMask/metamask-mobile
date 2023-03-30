import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Keyboard,
  InteractionManager,
  UIManager,
  LayoutAnimation,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/FontAwesome';
import { OutlinedTextField } from 'react-native-material-textfield';
import { createStyles } from './styles';
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import WarningExistingUserModal from '../WarningExistingUserModal';
import { useDeleteWallet } from '../../hooks/DeleteWallet';
import { strings } from '../../../../locales/i18n';
import {
  DELETE_WALLET_CONTAINER_ID,
  DELETE_WALLET_INPUT_BOX_ID,
} from '../../../constants/test-ids';
import { tlc } from '../../../util/general';
import { useTheme } from '../../../util/theme';
import Device from '../../../util/device';
import Routes from '../../../constants/navigation/Routes';
import {
  DELETE_MODAL_UNDERSTAND_CONTINUE_ID,
  DELETE_MODAL_CANCEL_BUTTON,
  DELETE_MODAL_DELETE_MY_WALLET_PERMANENTLY,
  DELETE_MODEL_DELETE_MY_WALLET_CANCEL,
} from '../../../../wdio/screen-objects/testIDs/Components/DeleteWalletModal.testIds';
import generateTestId from '../../../../wdio/utils/generateTestId';
import { trackEventV2 as trackEvent } from '../../../util/analyticsV2';
import { MetaMetricsEvents } from '../../../core/Analytics';

const DELETE_KEYWORD = 'delete';

if (Device.isAndroid() && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DeleteWalletModal = () => {
  const navigation = useNavigation();
  const { colors, themeAppearance } = useTheme();
  const styles = createStyles(colors);

  const modalRef = useRef<ReusableModalRef>(null);

  const [showConfirm, setShowConfirm] = useState<boolean>(false);
  const [deleteText, setDeleteText] = useState<string>('');
  const [disableButton, setDisableButton] = useState<boolean>(true);

  const [resetWalletState, deleteUser] = useDeleteWallet();

  const showConfirmModal = () => {
    setShowConfirm(true);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const isTextDelete = (text: string) => tlc(text) === DELETE_KEYWORD;

  const checkDelete = (text: string) => {
    setDeleteText(text);
    setDisableButton(!isTextDelete(text));
  };

  const dismissModal = (cb?: () => void): void =>
    modalRef?.current?.dismissModal(cb);

  const triggerClose = (): void => dismissModal();

  const navigateOnboardingRoot = (): void => {
    navigation.reset({
      routes: [
        {
          name: Routes.ONBOARDING.ROOT_NAV,
          state: {
            routes: [
              {
                name: Routes.ONBOARDING.NAV,
                params: {
                  screen: Routes.ONBOARDING.ONBOARDING,
                  params: { delete: true },
                },
              },
            ],
          },
        },
      ],
    });
  };

  const deleteWallet = async () => {
    triggerClose();
    await resetWalletState();
    await deleteUser();
    trackEvent(MetaMetricsEvents.DELETE_WALLET_MODAL_WALLET_DELETED, {});
    InteractionManager.runAfterInteractions(() => {
      navigateOnboardingRoot();
    });
  };

  return (
    <ReusableModal ref={modalRef}>
      {showConfirm ? (
        <WarningExistingUserModal
          warningModalVisible
          cancelText={strings('login.delete_my')}
          cancelTestID={DELETE_MODAL_DELETE_MY_WALLET_PERMANENTLY}
          confirmTestID={DELETE_MODEL_DELETE_MY_WALLET_CANCEL}
          cancelButtonDisabled={disableButton}
          onCancelPress={deleteWallet}
          onRequestClose={triggerClose}
          onConfirmPress={triggerClose}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.areYouSure}>
              <Text style={[styles.heading, styles.delete]}>
                {strings('login.type_delete', {
                  [DELETE_KEYWORD]: DELETE_KEYWORD,
                })}
              </Text>
              <OutlinedTextField
                style={styles.input}
                testID={DELETE_WALLET_INPUT_BOX_ID}
                {...generateTestId(Platform, DELETE_WALLET_INPUT_BOX_ID)}
                autoFocus
                returnKeyType={'done'}
                onChangeText={checkDelete}
                autoCapitalize="none"
                value={deleteText}
                baseColor={colors.border.default}
                tintColor={colors.primary.default}
                placeholderTextColor={colors.text.muted}
                keyboardAppearance={themeAppearance}
              />
            </View>
          </TouchableWithoutFeedback>
        </WarningExistingUserModal>
      ) : (
        <WarningExistingUserModal
          warningModalVisible
          cancelText={strings('login.i_understand')}
          onCancelPress={showConfirmModal}
          onRequestClose={triggerClose}
          onConfirmPress={triggerClose}
          cancelTestID={DELETE_MODAL_UNDERSTAND_CONTINUE_ID}
          confirmTestID={DELETE_MODAL_CANCEL_BUTTON}
        >
          <View style={styles.areYouSure} testID={DELETE_WALLET_CONTAINER_ID}>
            <Icon
              style={styles.warningIcon}
              size={46}
              color={colors.error.default}
              name="exclamation-triangle"
            />
            <Text style={[styles.heading, styles.red]}>
              {strings('login.are_you_sure')}
            </Text>
            <Text style={styles.warningText}>
              <Text>{strings('login.your_current_wallet')}</Text>
              <Text style={styles.bold}>{strings('login.removed_from')}</Text>
              <Text>{strings('login.this_action')}</Text>
            </Text>
            <Text style={[styles.warningText]}>
              <Text>{strings('login.you_can_only')}</Text>
              <Text style={styles.bold}>
                {strings('login.recovery_phrase')}
              </Text>
              <Text>{strings('login.metamask_does_not')}</Text>
            </Text>
          </View>
        </WarningExistingUserModal>
      )}
    </ReusableModal>
  );
};

export default React.memo(DeleteWalletModal);
