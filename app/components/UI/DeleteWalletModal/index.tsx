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
import { ForgotPasswordModalSelectorsIDs } from '../../../../e2e/selectors/Common/ForgotPasswordModal.selectors';
import { IMetaMetricsEvent, MetaMetricsEvents } from '../../../core/Analytics';
import { setCompletedOnboarding } from '../../../actions/onboarding';
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
import { MetricsEventBuilder } from '../../../core/Analytics/MetricsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { useMetrics } from '../../hooks/useMetrics';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import StorageWrapper from '../../../store/storage-wrapper';
import { OPTIN_META_METRICS_UI_SEEN } from '../../../constants/storage';
import type { NavigatableRootParamList } from '../../../util/navigation';
import type {
  StackNavigationProp,
  StackScreenProps,
} from '@react-navigation/stack';

if (Device.isAndroid() && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type DeleteWalletModalProps = StackScreenProps<
  NavigatableRootParamList,
  'DeleteWalletModal'
>;

const DeleteWalletModal = ({ route }: DeleteWalletModalProps) => {
  const navigation =
    useNavigation<
      StackNavigationProp<NavigatableRootParamList, 'DeleteWalletModal'>
    >();
  const { colors } = useTheme();
  const { isEnabled } = useMetrics();
  const styles = createStyles(colors);

  const isResetWalletFromParams =
    (route.params as { isResetWallet?: boolean })?.isResetWallet || false;
  const isOauthLoginSuccess =
    (route.params as { oauthLoginSuccess?: boolean })?.oauthLoginSuccess ||
    false;

  const modalRef = useRef<BottomSheetRef>(null);

  const [isResetWallet, setIsResetWallet] = useState<boolean>(false);

  const [resetWalletState, deleteUser] = useDeleteWallet();
  const dispatch = useDispatch();
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  const [isDeletingWallet, setIsDeletingWallet] = useState<boolean>(false);

  const { signOut } = useSignOut();

  const dismissModal = (cb?: () => void): void =>
    modalRef?.current?.onCloseBottomSheet(cb);

  const triggerClose = (): void => dismissModal();

  const navigateOnboardingRoot = (): void => {
    navigation.reset({
      routes: [
        {
          name: 'OnboardingRootNav',
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

  const track = (
    event: IMetaMetricsEvent,
    properties: Record<string, string | boolean | number>,
  ) => {
    trackOnboarding(
      MetricsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
    );
  };

  const deleteWallet = async () => {
    try {
      setIsDeletingWallet(true);
      dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
      signOut();
      await CookieManager.clearAll(true);
      await resetWalletState();
      await deleteUser();
      await StorageWrapper.removeItem(OPTIN_META_METRICS_UI_SEEN);
      dispatch(setCompletedOnboarding(false));
      // Track analytics for successful deletion
      track(MetaMetricsEvents.RESET_WALLET_CONFIRMED, {});
      InteractionManager.runAfterInteractions(() => {
        navigateOnboardingRoot();
      });
    } catch (error) {
      console.error('Error during wallet deletion:', error);
      triggerClose();
    } finally {
      setIsDeletingWallet(false);
    }
  };

  return (
    <BottomSheet ref={modalRef} isInteractable={!isDeletingWallet}>
      {!isResetWallet && !isResetWalletFromParams ? (
        <View
          style={styles.forgotPasswordContainer}
          testID={ForgotPasswordModalSelectorsIDs.CONTAINER}
        >
          <Text
            style={styles.heading}
            variant={TextVariant.HeadingMD}
            color={TextColor.Default}
            testID={ForgotPasswordModalSelectorsIDs.TITLE}
          >
            {strings('login.forgot_password_desc')}
          </Text>

          <Text
            variant={TextVariant.BodyMD}
            color={TextColor.Default}
            testID={ForgotPasswordModalSelectorsIDs.DESCRIPTION}
          >
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
                  style={styles.bold}
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
                  style={styles.bold}
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
            onPress={() => {
              setIsResetWallet(true);
              track(MetaMetricsEvents.RESET_WALLET, {
                account_type: isOauthLoginSuccess ? 'social' : 'metamask',
              });
            }}
            testID={ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON}
          />
        </View>
      ) : (
        <View style={styles.container}>
          <View
            style={styles.areYouSure}
            testID={ForgotPasswordModalSelectorsIDs.CONTAINER}
          >
            <View style={styles.iconContainer}>
              {!isResetWalletFromParams ? (
                <ButtonIcon
                  iconName={IconName.ArrowLeft}
                  size={ButtonIconSizes.Md}
                  iconColor={IconColor.Default}
                  onPress={() => setIsResetWallet(false)}
                  testID={ForgotPasswordModalSelectorsIDs.BACK_BUTTON}
                  isDisabled={isDeletingWallet}
                />
              ) : (
                <View style={styles.iconEmptyContainer} />
              )}
              <Icon
                style={styles.warningIcon}
                size={IconSize.Xl}
                color={IconColor.Error}
                name={IconName.Danger}
              />
              <View style={styles.iconEmptyContainer} />
            </View>

            <Text
              style={styles.heading}
              variant={TextVariant.HeadingMD}
              color={TextColor.Default}
              testID={ForgotPasswordModalSelectorsIDs.WARNING_TEXT}
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
                testID={ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON}
                loading={isDeletingWallet}
                isDisabled={isDeletingWallet}
              />
              <Button
                variant={ButtonVariants.Secondary}
                size={ButtonSize.Lg}
                onPress={triggerClose}
                label={strings('login.cancel')}
                width={ButtonWidthTypes.Full}
                testID={ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON}
                isDisabled={isDeletingWallet}
              />
            </View>
          </View>
        </View>
      )}
    </BottomSheet>
  );
};

export default DeleteWalletModal;
