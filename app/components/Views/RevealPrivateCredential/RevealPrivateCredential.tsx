/* eslint-disable no-mixed-spaces-and-tabs */
import React, { useEffect, useState, useCallback, useContext } from 'react';
import {
  Dimensions,
  FlatList,
  ImageBackground,
  Linking,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { InternalAccount } from '@metamask/keyring-internal-api';
import QRCode from 'react-native-qrcode-svg';
import {
  RouteProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTabView = ScrollView as any;
import { store } from '../../../store';
import ActionView from '../../UI/ActionView';

import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../component-library/components/Buttons/Button';
import { ScreenshotDeterrent } from '../../UI/ScreenshotDeterrent';
import { recordSRPRevealTimestamp } from '../../../actions/privacy';
import { WRONG_PASSWORD_ERROR } from '../../../constants/error';
import { SRP_GUIDE_URL } from '../../../constants/urls';
import ClipboardManager from '../../../core/ClipboardManager';
import { useTheme } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { passwordRequirementsMet } from '../../../util/password';
import useAuthentication from '../../../core/Authentication/hooks/useAuthentication';
import { ReauthenticateErrorType } from '../../../core/Authentication/types';

import Device from '../../../util/device';
import { strings } from '../../../../locales/i18n';
import { isHardwareAccount } from '../../../util/address';
import AppConstants from '../../../core/AppConstants';
import { createStyles } from './styles';
import { getNavigationOptionsTitle } from '../../../components/UI/Navbar';
import { RevealSeedViewSelectorsIDs } from './RevealSeedView.testIds';

import { selectSelectedInternalAccountFormattedAddress } from '../../../selectors/accountsController';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../util/trace';
import { getTraceTags } from '../../../util/sentry/tags';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import TabBar from '../../../component-library/components-temp/TabBar/TabBar';
import { ExportCredentialsIds } from '../MultichainAccounts/AccountDetails/ExportCredentials.testIds';
import SecurityQuizLockImage from '../../../images/security-quiz-intro-lock.svg';
import { Box } from '../../UI/Box/Box';
import {
  AlignItems,
  FlexDirection,
  JustifyContent,
} from '../../UI/Box/box.types';
import ButtonPrimary from '../../../component-library/components/Buttons/Button/variants/ButtonPrimary';
import ButtonSecondary from '../../../component-library/components/Buttons/Button/variants/ButtonSecondary';
import Routes from '../../../constants/navigation/Routes';
import ButtonLink from '../../../component-library/components/Buttons/Button/variants/ButtonLink';
import {
  ButtonIcon,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import Banner, {
  BannerAlertSeverity,
  BannerVariant,
} from '../../../component-library/components/Banners/Banner';
import TextField from '../../../component-library/components/Form/TextField/TextField';
import { TextFieldSize } from '../../../component-library/components/Form/TextField';
import { AppThemeKey } from '../../../util/theme/models';
import blurImage from '../../../images/blur.png';
import darkBlurImage from '../../../images/dark-blur.png';
import { ManualBackUpStepsSelectorsIDs } from '../ManualBackupStep1/ManualBackUpSteps.testIds';
import { IconName as IconNameLibrary } from '../../../component-library/components/Icons/Icon';
import {
  ButtonIconVariant,
  ToastContext,
  ToastVariants,
} from '../../../component-library/components/Toast';
import logo from '../../../images/branding/fox.png';

interface RootStackParamList extends ParamListBase {
  RevealPrivateCredential: {
    shouldUpdateNav?: boolean;
    selectedAccount?: InternalAccount;
    keyringId?: string;
  };
}

type RevealPrivateCredentialRouteProp = RouteProp<
  RootStackParamList,
  'RevealPrivateCredential'
>;

interface IRevealPrivateCredentialProps {
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  navigation: any;
  cancel: () => void;
  route: RevealPrivateCredentialRouteProp;
  showCancelButton?: boolean;
}

enum RevealSrpStage {
  Introduction = 'introduction',
  Quiz = 'quiz',
  ActionViewScreen = 'actionViewScreen',
}

const RevealPrivateCredential = ({
  navigation,
  cancel,
  route,
  showCancelButton,
}: IRevealPrivateCredentialProps) => {
  const hasNavigation = !!navigation;
  // TODO - Refactor or split RevealPrivateCredential when used in Nav stack vs outside of it
  const shouldUpdateNav = route?.params?.shouldUpdateNav;
  const [clipboardPrivateCredential, setClipboardPrivateCredential] =
    useState<string>('');
  const [unlocked, setUnlocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [warningIncorrectPassword, setWarningIncorrectPassword] =
    useState<string>('');
  const [clipboardEnabled, setClipboardEnabled] = useState<boolean>(false);
  const [revealSrpStage, setRevealSrpStage] = useState<RevealSrpStage>(
    RevealSrpStage.Introduction,
  );
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(1);
  const [questionAnswered, setQuestionAnswered] = useState<boolean>(false);
  const [correctAnswer, setCorrectAnswer] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showSeedPhrase, setShowSeedPhrase] = useState<boolean>(false);
  const { reauthenticate, revealSRP } = useAuthentication();
  const { navigate } = useNavigation();
  const { toastRef } = useContext(ToastContext);

  const keyringId = route?.params?.keyringId;

  const checkSummedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );

  const dispatch = useDispatch();

  const theme = useTheme();
  const { trackEvent, createEventBuilder } = useMetrics();
  const { colors, themeAppearance } = theme;
  const styles = createStyles(theme, colors);

  const selectedAddress =
    route?.params?.selectedAccount?.address || checkSummedAddress;

  const updateNavBar = () => {
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
  };

  const revealCredential = useCallback(
    async (pswd?: string) => {
      const traceName = TraceName.RevealSrp;

      let passwordToUse = pswd;

      try {
        if (!passwordToUse) {
          const { password: verifiedPassword } = await reauthenticate();
          passwordToUse = verifiedPassword;
        }

        // This will trigger after the user has been authenticated, we want to trace the actual
        // keyring operation of extracting the credential.
        trace({
          name: traceName,
          op: TraceOperation.RevealPrivateCredential,
          tags: getTraceTags(store.getState()),
        });

        const privateCredential = await revealSRP(passwordToUse, keyringId);

        if (privateCredential) {
          setClipboardPrivateCredential(privateCredential);
          setUnlocked(true);

          // We would reveal the private credential after this point, so that's the end of the flow.
          endTrace({
            name: traceName,
          });
        }
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        // we should not show the error message if the error is because password is not set with biometrics
        if (
          e.message.includes(
            ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
          )
        ) {
          return;
        }
        let msg = strings('reveal_credential.warning_incorrect_password');
        if (selectedAddress && isHardwareAccount(selectedAddress)) {
          msg = strings('reveal_credential.hardware_error');
        } else if (
          e.toString().toLowerCase() !== WRONG_PASSWORD_ERROR.toLowerCase()
        ) {
          msg = strings('reveal_credential.unknown_error');
        }

        setUnlocked(false);
        setWarningIncorrectPassword(msg);
      }
    },
    [selectedAddress, keyringId, reauthenticate, revealSRP],
  );

  const revealCredentialWithPassword = () => {
    revealCredential(password);
  };

  useEffect(() => {
    updateNavBar();
    // Track screen view analytics
    trackEvent(createEventBuilder(MetaMetricsEvents.REVEAL_SRP_SCREEN).build());
    revealCredential();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const navigateBack = () => {
    if (hasNavigation && shouldUpdateNav) {
      navigation.pop();
    } else {
      cancel?.();
    }
  };

  const cancelReveal = () => {
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
  };

  const tryUnlock = async () => {
    try {
      await reauthenticate(password);
    } catch {
      const msg = strings('reveal_credential.warning_incorrect_password');
      setWarningIncorrectPassword(msg);
      return;
    }

    const currentDate = new Date();
    dispatch(recordSRPRevealTimestamp(currentDate.toString()));
    trackEvent(
      createEventBuilder(MetaMetricsEvents.NEXT_REVEAL_SRP_CTA).build(),
    );
    revealCredentialWithPassword();
    setWarningIncorrectPassword('');
  };

  const onPasswordChange = (pswd: string) => {
    setPassword(pswd);
  };

  const done = () => {
    trackEvent(createEventBuilder(MetaMetricsEvents.SRP_DONE_CTA).build());
    navigateBack();
  };

  const copyPrivateCredentialToClipboard = async () => {
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
  };

  const renderTabBar = () => <TabBar />;

  const onTabBarChange = (event: { i: number }) => {
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
  };

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

  const renderSeedPhraseConcealer = () => (
    <View style={styles.seedPhraseConcealerContainer}>
      <TouchableOpacity
        onPress={() => setShowSeedPhrase(!showSeedPhrase)}
        style={styles.blurContainer}
        testID={ManualBackUpStepsSelectorsIDs.BLUR_BUTTON}
      >
        <ImageBackground
          source={
            themeAppearance === AppThemeKey.dark ? darkBlurImage : blurImage
          }
          style={styles.blurView}
          resizeMode="cover"
        />
        <View style={styles.seedPhraseConcealer}>
          <Icon
            name={IconName.EyeSlash}
            size={IconSize.Xl}
            color={IconColor.IconDefault}
          />
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('manual_backup_step_1.reveal')}
          </Text>
          <Text variant={TextVariant.BodySM} color={TextColor.Default}>
            {strings('manual_backup_step_1.watching')}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const words = clipboardPrivateCredential.split(' ');

  const renderSeedPhrase = () => (
    <Box
      style={styles.seedPhraseListContainer}
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.center}
      gap={12}
    >
      <View style={styles.seedPhraseContainer}>
        <FlatList
          data={words}
          numColumns={3}
          keyExtractor={(_, index) => index.toString()}
          renderItem={({ item, index }) => (
            <View style={[styles.inputContainer]}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {index + 1}.
              </Text>
              <Text
                variant={TextVariant.BodyMD}
                color={TextColor.Default}
                key={index}
                ellipsizeMode="tail"
                numberOfLines={1}
                style={styles.word}
                testID={`${ManualBackUpStepsSelectorsIDs.WORD_ITEM}-${index}`}
                adjustsFontSizeToFit
                allowFontScaling
                minimumFontScale={0.1}
                maxFontSizeMultiplier={0}
              >
                {item}
              </Text>
            </View>
          )}
        />
      </View>
      {clipboardEnabled ? (
        <Button
          label={strings('reveal_credential.copy_to_clipboard')}
          variant={ButtonVariants.Link}
          size={ButtonSize.Sm}
          onPress={() => copyPrivateCredentialToClipboard()}
          testID={
            RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_COPY_TO_CLIPBOARD_BUTTON
          }
          style={styles.clipboardButton}
          startIconName={IconNameLibrary.Copy}
        />
      ) : null}
    </Box>
  );

  const renderTabView = () => (
    <View style={styles.tabContainer}>
      <ScrollableTabView
        renderTabBar={() => renderTabBar()}
        // TODO: Replace "any" with type
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        onChangeTab={(event: any) => onTabBarChange(event)}
        style={styles.tabContentContainer}
      >
        <CustomTabView
          tabLabel={strings(`reveal_credential.text`)}
          testID={RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_TEXT}
        >
          <View style={styles.seedPhraseView}>
            {showSeedPhrase ? renderSeedPhrase() : renderSeedPhraseConcealer()}
          </View>
        </CustomTabView>
        <CustomTabView
          tabLabel={strings(`reveal_credential.qr_code`)}
          testID={RevealSeedViewSelectorsIDs.TAB_SCROLL_VIEW_QR_CODE}
        >
          <View
            style={styles.qrCodeWrapper}
            testID={
              RevealSeedViewSelectorsIDs.REVEAL_CREDENTIAL_QR_CODE_IMAGE_ID
            }
          >
            <QRCode
              value={clipboardPrivateCredential}
              size={Dimensions.get('window').width - 200}
              logo={logo}
              logoSize={50}
              backgroundColor={colors.background.default}
              color={colors.text.default}
            />
          </View>
        </CustomTabView>
      </ScrollableTabView>
    </View>
  );

  const renderPasswordEntry = () => (
    <>
      <Text style={styles.enterPassword} variant={TextVariant.BodyMDMedium}>
        {strings('reveal_credential.enter_password')}
      </Text>
      <TextField
        size={TextFieldSize.Lg}
        placeholder={'Password'}
        placeholderTextColor={colors.text.muted}
        onChangeText={onPasswordChange}
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        onSubmitEditing={tryUnlock}
        keyboardAppearance={themeAppearance}
        testID={RevealSeedViewSelectorsIDs.PASSWORD_INPUT_BOX_ID}
        returnKeyType="done"
        autoComplete="new-password"
        autoFocus
        endAccessory={
          <ButtonIcon
            iconName={showPassword ? IconName.Eye : IconName.EyeSlash}
            onPress={() => setShowPassword(!showPassword)}
          />
        }
      />
      <Text
        style={styles.warningText}
        testID={RevealSeedViewSelectorsIDs.PASSWORD_WARNING_ID}
      >
        {warningIncorrectPassword}
      </Text>
    </>
  );

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

  const handleLearnMoreClick = useCallback(() => {
    navigate(Routes.WEBVIEW.MAIN, {
      screen: Routes.WEBVIEW.SIMPLE,
      params: {
        url: SRP_GUIDE_URL,
      },
    });
  }, [navigate]);

  const renderSecurityQuizLockImage = () => (
    <Box
      testID={ExportCredentialsIds.CONTAINER}
      style={styles.quizContainer}
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.center}
      justifyContent={JustifyContent.spaceBetween}
    >
      <Box
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
        justifyContent={JustifyContent.center}
      >
        <SecurityQuizLockImage
          name="security-quiz-lock"
          height={220}
          width={190}
        />
        <Text
          variant={TextVariant.BodyMD}
          color={TextColor.Alternative}
          style={styles.quizDescription}
        >
          {strings('multichain_accounts.reveal_srp.description')}
        </Text>
      </Box>
      <Box
        flexDirection={FlexDirection.Column}
        alignItems={AlignItems.center}
        style={styles.quizButtonContainer}
        gap={16}
      >
        <ButtonPrimary
          onPress={() => setRevealSrpStage(RevealSrpStage.Quiz)}
          size={ButtonSize.Lg}
          label={strings('multichain_accounts.reveal_srp.get_started')}
          testID={ExportCredentialsIds.NEXT_BUTTON}
          style={styles.button}
        />
        <ButtonLink
          onPress={handleLearnMoreClick}
          label={strings('multichain_accounts.reveal_srp.learn_more')}
          testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
          style={styles.button}
        />
      </Box>
    </Box>
  );

  const handleQuestionAnswerClick = (buttonIndex: number) => {
    if (currentQuestionIndex === 1) {
      setCorrectAnswer(buttonIndex === 2);
    } else {
      setCorrectAnswer(buttonIndex === 1);
    }
    setQuestionAnswered(true);
  };

  const handleAnsweredQuestionClick = () => {
    if (currentQuestionIndex === 1 && correctAnswer) {
      setCurrentQuestionIndex(2);
    } else if (currentQuestionIndex === 2 && correctAnswer) {
      setRevealSrpStage(RevealSrpStage.ActionViewScreen);
    }
    setQuestionAnswered(false);
  };

  const renderSecurityQuiz = () => (
    <Box
      style={styles.quizQuestionContainer}
      flexDirection={FlexDirection.Column}
      alignItems={AlignItems.flexStart}
      justifyContent={JustifyContent.flexStart}
    >
      <Text
        variant={TextVariant.BodyMD}
        color={TextColor.Alternative}
        style={styles.stepIndicatorContainer}
      >
        {strings('srp_security_quiz.question_step', {
          step: currentQuestionIndex,
          total: 2,
        })}
      </Text>

      {questionAnswered && (
        <Box
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.flexStart}
          justifyContent={JustifyContent.flexStart}
          gap={16}
        >
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            justifyContent={JustifyContent.center}
            gap={8}
          >
            <Icon
              name={correctAnswer ? IconName.Confirmation : IconName.CircleX}
              size={IconSize.Lg}
              color={
                correctAnswer
                  ? IconColor.SuccessDefault
                  : IconColor.ErrorDefault
              }
            />
            <Text
              variant={TextVariant.HeadingLG}
              color={correctAnswer ? TextColor.Success : TextColor.Error}
            >
              {strings(
                correctAnswer
                  ? 'srp_security_quiz.correct'
                  : 'srp_security_quiz.incorrect',
              )}
            </Text>
          </Box>
          {currentQuestionIndex === 1 && (
            <Box
              flexDirection={FlexDirection.Column}
              alignItems={AlignItems.flexStart}
              justifyContent={JustifyContent.flexStart}
              gap={16}
            >
              <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
                {strings(
                  correctAnswer
                    ? 'srp_security_quiz.question_one.right_answer_title'
                    : 'srp_security_quiz.question_one.wrong_answer_title',
                )}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings(
                  correctAnswer
                    ? 'srp_security_quiz.question_one.right_answer_description'
                    : 'srp_security_quiz.question_one.wrong_answer_description',
                )}
              </Text>
            </Box>
          )}
          {currentQuestionIndex === 2 && (
            <Box
              flexDirection={FlexDirection.Column}
              alignItems={AlignItems.flexStart}
              justifyContent={JustifyContent.flexStart}
              gap={16}
            >
              <Text variant={TextVariant.HeadingLG} color={TextColor.Default}>
                {strings(
                  correctAnswer
                    ? 'srp_security_quiz.question_two.right_answer_title'
                    : 'srp_security_quiz.question_two.wrong_answer_title',
                )}
              </Text>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings(
                  correctAnswer
                    ? 'srp_security_quiz.question_two.right_answer_description'
                    : 'srp_security_quiz.question_two.wrong_answer_description',
                )}
              </Text>
            </Box>
          )}
        </Box>
      )}

      {!questionAnswered && (
        <Text
          variant={TextVariant.HeadingLG}
          color={TextColor.Default}
          style={styles.quizQuestion}
        >
          {strings(
            currentQuestionIndex === 1
              ? 'srp_security_quiz.question_one.question'
              : 'srp_security_quiz.question_two.question',
          )}
        </Text>
      )}

      {!questionAnswered ? (
        <Box
          flexDirection={FlexDirection.Column}
          alignItems={AlignItems.center}
          style={styles.quizButtonContainer}
          gap={16}
        >
          <ButtonSecondary
            onPress={() => handleQuestionAnswerClick(1)}
            size={ButtonSize.Lg}
            label={strings(
              currentQuestionIndex === 1
                ? 'srp_security_quiz.question_one.wrong_answer'
                : 'srp_security_quiz.question_two.right_answer',
            )}
            testID={`${ExportCredentialsIds.ANSWER_BUTTON}-1`}
            style={styles.button}
          />
          <ButtonSecondary
            onPress={() => handleQuestionAnswerClick(2)}
            size={ButtonSize.Lg}
            label={strings(
              currentQuestionIndex === 1
                ? 'srp_security_quiz.question_one.right_answer'
                : 'srp_security_quiz.question_two.wrong_answer',
            )}
            testID={`${ExportCredentialsIds.ANSWER_BUTTON}-2`}
            style={styles.button}
          />
          <ButtonLink
            onPress={handleLearnMoreClick}
            label={strings('multichain_accounts.reveal_srp.learn_more')}
            testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
            style={styles.button}
          />
        </Box>
      ) : (
        <Box
          flexDirection={FlexDirection.Column}
          style={styles.quizAnsweredContainer}
          gap={16}
        >
          <ButtonPrimary
            onPress={handleAnsweredQuestionClick}
            size={ButtonSize.Lg}
            label={strings(
              correctAnswer
                ? 'srp_security_quiz.continue'
                : 'srp_security_quiz.try_again',
            )}
            testID={
              correctAnswer
                ? ExportCredentialsIds.CONTINUE_BUTTON
                : ExportCredentialsIds.TRY_AGAIN_BUTTON
            }
            style={styles.button}
          />
          <ButtonLink
            onPress={handleLearnMoreClick}
            label={strings('multichain_accounts.reveal_srp.learn_more')}
            testID={ExportCredentialsIds.LEARN_MORE_BUTTON}
            style={styles.button}
          />
        </Box>
      )}
    </Box>
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
      // The cancel button here is not named correctly. When it is unlocked, the button is shown as "Done"
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
          renderTabView()
        ) : (
          <View style={styles.rowWrapper}>{renderPasswordEntry()}</View>
        )}
      </View>
    </ActionView>
  );

  const renderContent = () => {
    if (revealSrpStage === RevealSrpStage.Introduction) {
      return renderSecurityQuizLockImage();
    }
    if (revealSrpStage === RevealSrpStage.Quiz) {
      return renderSecurityQuiz();
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
