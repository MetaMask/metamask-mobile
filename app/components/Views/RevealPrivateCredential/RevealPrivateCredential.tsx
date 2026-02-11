/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import { Linking, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import ActionView from '../../UI/ActionView';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import ClipboardManager from '../../../core/ClipboardManager';
import { useTheme } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { passwordRequirementsMet } from '../../../util/password';
import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import AppConstants from '../../../core/AppConstants';
import { createStyles } from './styles';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import { RevealSeedViewSelectorsIDs } from './RevealSeedView.testIds';
import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import { IconName as IconNameLibrary } from '../../../component-library/components/Icons/Icon';
import {
  ButtonIconVariant,
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import Routes from '../../../constants/navigation/Routes';
import {
  SRPQuizIntroduction,
  SRPSecurityQuiz,
  PasswordEntry,
  SRPTabView,
} from './components';
import { useRevealCredential, useSRPQuiz } from './hooks';
import { IRevealPrivateCredentialProps, RevealSrpStage } from './types';

const RevealPrivateCredential = ({
  navigation,
  cancel,
  route,
  showCancelButton,
}: IRevealPrivateCredentialProps) => {
  const hasNavigation = !!navigation;
  const shouldUpdateNav = route?.params?.shouldUpdateNav;
  const keyringId = route?.params?.keyringId;

  const [clipboardEnabled, setClipboardEnabled] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState<boolean>(false);

  const { navigate } = useNavigation();
  const { toastRef } = useContext(ToastContext);

  const checkSummedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors } = theme;
  const styles = createStyles(theme, colors);

  const selectedAddress =
    route?.params?.selectedAccount?.address || checkSummedAddress;

  const {
    unlocked,
    password,
    warningIncorrectPassword,
    clipboardPrivateCredential,
    setPassword,
    revealCredential,
    tryUnlock,
  } = useRevealCredential({
    selectedAddress,
    keyringId,
  });

  const {
    revealSrpStage,
    currentQuestionIndex,
    questionAnswered,
    correctAnswer,
    handleGetStartedClick,
    handleQuestionAnswerClick,
    handleAnsweredQuestionClick,
  } = useSRPQuiz();

  const updateNavBar = useCallback(() => {
    if (!hasNavigation || !shouldUpdateNav) {
      return;
    }
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('reveal_credential.seed_phrase_title'),
        navigation,
        false,
        colors,
        MetaMetricsEvents.GO_BACK_SRP_SCREEN,
      ),
    );
  }, [hasNavigation, shouldUpdateNav, navigation, colors]);

  useEffect(() => {
    updateNavBar();
    trackEvent(createEventBuilder(MetaMetricsEvents.REVEAL_SRP_SCREEN).build());
    revealCredential();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    Device.isAndroid() &&
      Device.getDeviceAPILevel().then((apiLevel) => {
        if (apiLevel < AppConstants.LEAST_SUPPORTED_ANDROID_API_LEVEL) {
          setClipboardEnabled(false);
          return;
        }
      });

    setClipboardEnabled(true);
  }, []);

  const navigateBack = useCallback(() => {
    if (hasNavigation && shouldUpdateNav) {
      navigation.pop();
    } else {
      cancel?.();
    }
  }, [hasNavigation, shouldUpdateNav, navigation, cancel]);

  const cancelReveal = useCallback(() => {
    if (!unlocked)
      trackEvent(
        createEventBuilder(MetaMetricsEvents.REVEAL_SRP_CANCELLED)
          .addProperties({
            view: 'Enter password',
          })
          .build(),
      );

    trackEvent(
      createEventBuilder(MetaMetricsEvents.CANCEL_REVEAL_SRP_CTA).build(),
    );
    if (cancel) return cancel();
    navigateBack();
  }, [unlocked, trackEvent, createEventBuilder, cancel, navigateBack]);

  const done = useCallback(() => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SRP_DONE_CTA).build());
    navigateBack();
  }, [trackEvent, createEventBuilder, navigateBack]);

  const handleLearnMoreClick = useCallback(() => {
    navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SRP_GUIDE_URL,
      },
    });
  }, [navigate]);

  const onTabBarChange = useCallback(
    (event: { i: number }) => {
      if (event.i === 0) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.REVEAL_SRP_COMPLETED)
            .addProperties({ action: 'viewed SRP' })
            .build(),
        );
        trackEvent(createEventBuilder(MetaMetricsEvents.VIEW_SRP).build());
      } else if (event.i === 1) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.REVEAL_SRP_COMPLETED)
            .addProperties({ action: 'viewed QR code' })
            .build(),
        );
        trackEvent(createEventBuilder(MetaMetricsEvents.VIEW_SRP_QR).build());
      }
    },
    [trackEvent, createEventBuilder],
  );

  const copyPrivateCredentialToClipboard = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.REVEAL_SRP_COMPLETED)
        .addProperties({
          action: 'copied to clipboard',
        })
        .build(),
    );

    trackEvent(createEventBuilder(MetaMetricsEvents.COPY_SRP).build());
    await ClipboardManager.setStringExpire(clipboardPrivateCredential);

    toastRef?.current?.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [
        {
          label: strings('reveal_credential.copied_to_clipboard'),
        },
      ],
      hasNoTimeout: false,
      closeButtonOptions: {
        variant: ButtonIconVariant.Icon,
        iconName: IconNameLibrary.Close,
        onPress: () => {
          toastRef?.current?.closeToast();
        },
      },
    });
  }, [trackEvent, createEventBuilder, clipboardPrivateCredential, toastRef]);

  const renderSRPExplanation = () => (
    <Text style={styles.normalText}>
      {strings('reveal_credential.seed_phrase_explanation')[0]}{' '}
      <Text
        color={colors.primary.default}
        onPress={() => Linking.openURL(SRP_GUIDE_URL)}
      >
        {strings('reveal_credential.seed_phrase_explanation')[1]}
      </Text>{' '}
      {strings('reveal_credential.seed_phrase_explanation')[2]}{' '}
      <Text>{strings('reveal_credential.seed_phrase_explanation')[3]}</Text>
    </Text>
  );

  const renderWarning = () => (
    <View testID={RevealSeedViewSelectorsIDs.SEED_PHRASE_WARNING_ID}>
      <Banner
        variant={BannerVariant.Alert}
        severity={BannerAlertSeverity.Error}
        title={
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            {strings('reveal_credential.seed_phrase_warning_explanation')}
          </Text>
        }
        style={styles.warningWrapper}
      />
    </View>
  );

  const renderActionView = () => (
    <ActionView
      cancelText={
        unlocked
          ? strings('reveal_credential.done')
          : strings('reveal_credential.cancel')
      }
      confirmText={strings('reveal_credential.confirm')}
      onCancelPress={unlocked ? done : cancelReveal}
      onConfirmPress={() => tryUnlock()}
      showConfirmButton={!unlocked}
      confirmDisabled={!passwordRequirementsMet(password)}
      cancelTestID={
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_CANCEL_BUTTON_ID
      }
      confirmTestID={
        RevealSeedViewSelectorsIDs.SECRET_RECOVERY_PHRASE_NEXT_BUTTON_ID
      }
      scrollViewTestID={RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_SCROLL_ID}
      showCancelButton={Boolean(showCancelButton || unlocked)}
      enableOnAndroid
      enableAutomaticScroll
      extraScrollHeight={40}
      showsVerticalScrollIndicator={false}
    >
      <View>
        {/* @ts-expect-error - React Native style type mismatch due to outdated @types/react-native See: https://github.com/MetaMask/metamask-mobile/pull/18956#discussion_r2316407382 */}
        <View style={[styles.rowWrapper, styles.normalText]}>
          <>
            {unlocked ? (
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('reveal_credential.reveal_srp_description')}
              </Text>
            ) : (
              renderSRPExplanation()
            )}
            {unlocked ? null : renderWarning()}
          </>
        </View>
        {unlocked ? (
          <SRPTabView
            clipboardPrivateCredential={clipboardPrivateCredential}
            showSeedPhrase={showSeedPhrase}
            clipboardEnabled={clipboardEnabled}
            onRevealSeedPhrase={() => setShowSeedPhrase(!showSeedPhrase)}
            onCopyToClipboard={copyPrivateCredentialToClipboard}
            onTabChange={onTabBarChange}
            styles={styles}
          />
        ) : (
          <View style={styles.rowWrapper}>
            <PasswordEntry
              onPasswordChange={setPassword}
              onSubmit={tryUnlock}
              warningMessage={warningIncorrectPassword}
              showPassword={showPassword}
              onToggleShowPassword={() => setShowPassword(!showPassword)}
              styles={styles}
            />
          </View>
        )}
      </View>
    </ActionView>
  );

  const renderContent = () => {
    if (revealSrpStage === RevealSrpStage.Introduction) {
      return (
        <SRPQuizIntroduction
          onGetStarted={handleGetStartedClick}
          onLearnMore={handleLearnMoreClick}
          styles={styles}
        />
      );
    }
    if (revealSrpStage === RevealSrpStage.Quiz) {
      return (
        <SRPSecurityQuiz
          currentQuestionIndex={currentQuestionIndex}
          questionAnswered={questionAnswered}
          correctAnswer={correctAnswer}
          onAnswerClick={handleQuestionAnswerClick}
          onContinueClick={handleAnsweredQuestionClick}
          onLearnMore={handleLearnMoreClick}
          styles={styles}
        />
      );
    }
    return renderActionView();
  };

  return (
    <View
      style={styles.wrapper}
      testID={RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_CONTAINER_ID}
    >
      {renderContent()}
      <ScreenshotDeterrent
        enabled={unlocked}
        isSRP
        hasNavigation={hasNavigation}
      />
    </View>
  );
};

export default RevealPrivateCredential;
