import React, { useState, useRef } from 'react';
import { View, InteractionManager, UIManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import { createStyles } from './styles';
import { useDeleteWallet } from '../../hooks/DeleteWallet';
import { strings } from '../../../../locales/i18n';
import { tlc } from '../../../util/general';
import { useTheme } from '../../../util/theme';
import Device from '../../../util/device';
import Routes from '../../../constants/navigation/Routes';
import { DeleteWalletModalSelectorsIDs } from '../../../../e2e/selectors/Settings/SecurityAndPrivacy/DeleteWalletModal.selectors';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { useDispatch, useSelector } from 'react-redux';
import { clearHistory } from '../../../actions/browser';
import CookieManager from '@react-native-cookies/cookies';
import { RootState } from '../../../reducers';
import BottomSheet, {
  BottomSheetRef,
} from '../../../component-library/components/BottomSheets/BottomSheet';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import TextField, {
  TextFieldSize,
} from '../../../component-library/components/Form/TextField';
import Label from '../../../component-library/components/Form/Label';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';

const DELETE_KEYWORD = 'delete';

if (Device.isAndroid() && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DeleteWalletModal = () => {
  const navigation = useNavigation();
  const { colors, themeAppearance } = useTheme();
  const { trackEvent, createEventBuilder, isEnabled } = useMetrics();
  const styles = createStyles(colors);

  const modalRef = useRef<BottomSheetRef>(null);

  const [deleteText, setDeleteText] = useState<string>('');
  const [disableButton, setDisableButton] = useState<boolean>(true);

  const [resetWalletState, deleteUser] = useDeleteWallet();
  const dispatch = useDispatch();
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  const isTextDelete = (text: string) => tlc(text) === DELETE_KEYWORD;

  const checkDelete = (text: string) => {
    setDeleteText(text);
    setDisableButton(!isTextDelete(text));
  };

  const dismissModal = (cb?: () => void): void =>
    modalRef?.current?.onCloseBottomSheet(cb);

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
    await dispatch(
      clearHistory(isEnabled(), isDataCollectionForMarketingEnabled),
    );
    await CookieManager.clearAll(true);
    triggerClose();
    await resetWalletState();
    await deleteUser();
    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.DELETE_WALLET_MODAL_WALLET_DELETED,
      ).build(),
    );
    InteractionManager.runAfterInteractions(() => {
      navigateOnboardingRoot();
    });
  };

  return (
    <BottomSheet ref={modalRef}>
      <View style={styles.container}>
        <View
          style={styles.areYouSure}
          testID={DeleteWalletModalSelectorsIDs.CONTAINER}
        >
          {
            <Icon
              style={styles.warningIcon}
              size={IconSize.Xl}
              color={IconColor.Error}
              name={IconName.Danger}
            />
          }
          <Text
            style={styles.heading}
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
          >
            {strings('login.are_you_sure')}
          </Text>
          <View style={styles.warningTextContainer}>
            <Text
              style={styles.warningText}
              variant={TextVariant.BodyMD}
              color={TextColor.Default}
            >
              {strings('login.your_current_wallet')}{' '}
              <Text
                style={styles.warningText}
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
              >
                {strings('login.removed_from')}
              </Text>{' '}
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('login.this_action')}
              </Text>
            </Text>
            <Text style={styles.warningText}>
              {strings('login.you_can_only')}
            </Text>
          </View>
          <View style={styles.inputContainer}>
            <Label variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
              {strings('login.type_delete', {
                [DELETE_KEYWORD]: DELETE_KEYWORD,
              })}
            </Label>
            <TextField
              size={TextFieldSize.Lg}
              onChangeText={checkDelete}
              autoCapitalize="none"
              value={deleteText}
              keyboardAppearance={themeAppearance}
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
              variant={ButtonVariants.Primary}
              size={ButtonSize.Lg}
              onPress={deleteWallet}
              label={strings('login.delete_my')}
              width={ButtonWidthTypes.Full}
              isDanger
              isDisabled={disableButton}
            />
            <Button
              variant={ButtonVariants.Secondary}
              size={ButtonSize.Lg}
              onPress={triggerClose}
              label={strings('login.cancel')}
              width={ButtonWidthTypes.Full}
            />
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

export default React.memo(DeleteWalletModal);
