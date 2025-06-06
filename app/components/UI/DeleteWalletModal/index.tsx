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
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { useSignOut } from '../../../util/identity/hooks/useAuthentication';
import { setCompletedOnboarding } from '../../../actions/onboarding';

if (Device.isAndroid() && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DeleteWalletModal = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { trackEvent, createEventBuilder, isEnabled } = useMetrics();
  const styles = createStyles(colors);

  const modalRef = useRef<BottomSheetRef>(null);

  const [isResetWallet, setIsResetWallet] = useState<boolean>(false);

  const [resetWalletState, deleteUser] = useDeleteWallet();
  const dispatch = useDispatch();
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  const { signOut } = useSignOut();

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
    signOut();
    await dispatch(setCompletedOnboarding(false));
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
      {!isResetWallet ? (
        <View style={styles.forgotPasswordContainer}>
          <Text
            style={styles.heading}
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
          >
            {strings('login.forgot_password_desc')}
          </Text>

          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {strings('login.forgot_password_desc_2')}
          </Text>

          <View style={styles.forgotPasswordPointsContainer}>
            <View style={styles.forgotPasswordPoint}>
              <Icon
                name={IconName.FaceId}
                size={IconSize.Md}
                color={IconColor.Muted}
              />
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Default}
                style={styles.forgotPasswordPointText}
              >
                {strings('login.forgot_password_point_1')}{' '}
                <Text
                  variant={TextVariant.BodyMDBold}
                  color={TextColor.Default}
                >
                  {strings('login.forgot_password_point_1_bold')}
                </Text>{' '}
                {strings('login.forgot_password_point_1_1')}
              </Text>
            </View>
            <View style={styles.forgotPasswordPoint}>
              <Icon
                name={IconName.SecurityKey}
                size={IconSize.Md}
                color={IconColor.Muted}
              />
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Default}
                style={styles.forgotPasswordPointText}
              >
                {strings('login.forgot_password_point_2')}{' '}
                <Text
                  variant={TextVariant.BodyMDBold}
                  color={TextColor.Default}
                >
                  {strings('login.forgot_password_point_2_bold')}{' '}
                </Text>
                {strings('login.forgot_password_point_2_1')}
              </Text>
            </View>
          </View>

          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            label={strings('login.reset_wallet')}
            width={ButtonWidthTypes.Full}
            isDanger
            onPress={() => setIsResetWallet(true)}
          />
        </View>
      ) : (
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
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('login.reset_wallet_desc')}{' '}
                <Text
                  style={styles.warningText}
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {strings('login.reset_wallet_desc_bold')}
                </Text>{' '}
                {strings('login.reset_wallet_desc_2')}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                {strings('login.reset_wallet_desc_srp')}
              </Text>
            </View>
            <View style={styles.buttonContainer}>
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                onPress={deleteWallet}
                label={strings('login.erase_my')}
                width={ButtonWidthTypes.Full}
                isDanger
                testID={DeleteWalletModalSelectorsIDs.DELETE_PERMANENTLY_BUTTON}
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                onPress={triggerClose}
                label={strings('login.cancel')}
                width={ButtonWidthTypes.Full}
                testID={DeleteWalletModalSelectorsIDs.CANCEL_BUTTON}
              />
            </View>
          </View>
        </View>
      )}
    </BottomSheet>
  );
};

export default React.memo(DeleteWalletModal);
