import React, { useState, useRef } from 'react';
import { InteractionManager, UIManager } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { Authentication } from '../../../core';
import { strings } from '../../../../locales/i18n';
import Device from '../../../util/device';
import Routes from '../../../constants/navigation/Routes';
import { ForgotPasswordModalSelectorsIDs } from '../../../util/ForgotPasswordModal.testIds';
import { IMetaMetricsEvent, MetaMetricsEvents } from '../../../core/Analytics';
import { useDispatch, useSelector } from 'react-redux';
import { clearHistory } from '../../../actions/browser';
import CookieManager from '@react-native-cookies/cookies';
import { RootState } from '../../../reducers';
import { AnalyticsEventBuilder } from '../../../util/analytics/AnalyticsEventBuilder';
import trackOnboarding from '../../../util/metrics/TrackOnboarding/trackOnboarding';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  Box,
  ButtonSize,
  ButtonsAlignment,
  FontWeight,
  HeaderStandard,
  IconAlertSeverity,
  IconName,
  ListItem,
  ListItemVariant,
  SectionDivider,
  Text,
  TextColor,
  TextVariant,
  TitleAlert,
} from '@metamask/design-system-react-native';

if (Device.isAndroid() && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const DeleteWalletModal: React.FC = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  const { isEnabled } = useAnalytics();

  const isResetWalletFromParams =
    (route.params as { isResetWallet?: boolean })?.isResetWallet || false;
  const isOauthLoginSuccess =
    (route.params as { oauthLoginSuccess?: boolean })?.oauthLoginSuccess ||
    false;

  const modalRef = useRef<BottomSheetRef>(null);

  const [isResetWallet, setIsResetWallet] = useState<boolean>(false);

  const dispatch = useDispatch();
  const isDataCollectionForMarketingEnabled = useSelector(
    (state: RootState) => state.security.dataCollectionForMarketing,
  );

  const [isDeletingWallet, setIsDeletingWallet] = useState<boolean>(false);

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

  const track = (
    event: IMetaMetricsEvent,
    properties: Record<string, string | boolean | number>,
  ) => {
    trackOnboarding(
      AnalyticsEventBuilder.createEventBuilder(event)
        .addProperties(properties)
        .build(),
    );
  };

  const deleteWallet = async () => {
    setIsDeletingWallet(true);
    try {
      dispatch(clearHistory(isEnabled(), isDataCollectionForMarketingEnabled));
      await CookieManager.clearAll(true);
      await Authentication.deleteWallet();
      // Track analytics for successful deletion
      track(MetaMetricsEvents.RESET_WALLET_CONFIRMED, {});
      InteractionManager.runAfterInteractions(() => {
        navigateOnboardingRoot();
      });
    } catch (error) {
      console.error('Error during wallet deletion:', error);
      triggerClose();
    }
    setIsDeletingWallet(false);
  };

  const showForgotPassword = !isResetWallet && !isResetWalletFromParams;

  return (
    <BottomSheet
      ref={modalRef}
      isInteractable={!isDeletingWallet}
      goBack={navigation.goBack}
    >
      {showForgotPassword ? (
        <>
          <BottomSheetHeader
            onClose={triggerClose}
            testID={ForgotPasswordModalSelectorsIDs.TITLE}
            closeButtonProps={{
              testID: ForgotPasswordModalSelectorsIDs.CLOSE_BUTTON,
            }}
          >
            {strings('login.forgot_password_desc')}
          </BottomSheetHeader>
          <Box
            testID={ForgotPasswordModalSelectorsIDs.CONTAINER}
            paddingHorizontal={4}
          >
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              testID={ForgotPasswordModalSelectorsIDs.DESCRIPTION}
            >
              {strings('login.forgot_password_desc_2')}
            </Text>
          </Box>
          <ListItem
            variant={ListItemVariant.MultiLine}
            avatar={
              <AvatarIcon
                iconName={IconName.FaceId}
                size={AvatarIconSize.Md}
                severity={AvatarIconSeverity.Neutral}
              />
            }
            title={
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('login.forgot_password_point_1')}{' '}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  fontWeight={FontWeight.Bold}
                >
                  {strings('login.forgot_password_point_1_bold')}
                </Text>{' '}
                {strings('login.forgot_password_point_1_1')}
              </Text>
            }
          />
          <SectionDivider marginVertical={0} marginHorizontal={4} />
          <ListItem
            variant={ListItemVariant.MultiLine}
            avatar={
              <AvatarIcon
                iconName={IconName.ShieldLock}
                size={AvatarIconSize.Md}
                severity={AvatarIconSeverity.Neutral}
              />
            }
            title={
              <Text variant={TextVariant.BodyMd} color={TextColor.TextDefault}>
                {strings('login.forgot_password_point_2')}{' '}
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  fontWeight={FontWeight.Bold}
                >
                  {strings('login.forgot_password_point_2_bold')}{' '}
                </Text>
                {strings('login.forgot_password_point_2_1')}
              </Text>
            }
          />
          <BottomSheetFooter
            primaryButtonProps={{
              children: strings('login.reset_wallet'),
              isDanger: true,
              size: ButtonSize.Lg,
              onPress: () => {
                setIsResetWallet(true);
                track(MetaMetricsEvents.RESET_WALLET, {
                  account_type: isOauthLoginSuccess ? 'social' : 'metamask',
                });
              },
              testID: ForgotPasswordModalSelectorsIDs.RESET_WALLET_BUTTON,
            }}
            twClassName="pt-4"
          />
        </>
      ) : (
        <>
          <HeaderStandard
            onBack={
              !isResetWalletFromParams
                ? () => setIsResetWallet(false)
                : undefined
            }
            onClose={triggerClose}
            backButtonProps={
              !isResetWalletFromParams
                ? {
                    testID: ForgotPasswordModalSelectorsIDs.BACK_BUTTON,
                    isDisabled: isDeletingWallet,
                  }
                : undefined
            }
            closeButtonProps={{
              testID: ForgotPasswordModalSelectorsIDs.CLOSE_BUTTON,
              isDisabled: isDeletingWallet,
            }}
          />
          <Box
            testID={ForgotPasswordModalSelectorsIDs.CONTAINER}
            paddingHorizontal={4}
            gap={4}
          >
            <TitleAlert
              severity={IconAlertSeverity.Danger}
              title={strings('login.are_you_sure')}
              titleProps={{
                testID: ForgotPasswordModalSelectorsIDs.WARNING_TEXT,
              }}
            />
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('login.reset_wallet_desc')}{' '}
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
              >
                {strings('login.reset_wallet_desc_bold')}
              </Text>{' '}
              {strings('login.reset_wallet_desc_2')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('login.reset_wallet_desc_srp_1')}{' '}
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                fontWeight={FontWeight.Bold}
              >
                {strings('login.reset_wallet_desc_srp_bold')}
              </Text>
              {'. '}
              {strings('login.reset_wallet_desc_srp_2')}
            </Text>
          </Box>
          <BottomSheetFooter
            buttonsAlignment={ButtonsAlignment.Vertical}
            primaryButtonProps={{
              children: strings('login.erase_my'),
              onPress: deleteWallet,
              size: ButtonSize.Lg,
              isDanger: true,
              isLoading: isDeletingWallet,
              isDisabled: isDeletingWallet,
              testID: ForgotPasswordModalSelectorsIDs.YES_RESET_WALLET_BUTTON,
              style: { marginTop: 0 },
            }}
            secondaryButtonProps={{
              children: strings('login.cancel'),
              onPress: triggerClose,
              size: ButtonSize.Lg,
              isDisabled: isDeletingWallet,
              testID: ForgotPasswordModalSelectorsIDs.CANCEL_BUTTON,
              twClassName: 'mt-4',
            }}
            twClassName="pt-4 flex-col-reverse"
          />
        </>
      )}
    </BottomSheet>
  );
};

export default DeleteWalletModal;
