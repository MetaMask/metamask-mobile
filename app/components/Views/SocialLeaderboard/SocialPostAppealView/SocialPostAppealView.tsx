import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  StackActions,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  AvatarIcon,
  AvatarIconSeverity,
  AvatarIconSize,
  BannerAlert,
  BannerAlertSeverity,
  Box,
  BoxAlignItems,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  HelpText,
  HelpTextSeverity,
  IconName,
  Label,
  Text,
  TextArea,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import Routes from '../../../../constants/navigation/Routes';
import { SOCIAL_APPEAL_MESSAGE_MAX_LENGTH } from '../../../../constants/urls';
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../../core/NavigationService/types';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import { useSubmitSocialAppeal } from '../../../UI/SocialFeed/hooks/useSubmitSocialAppeal';
import { validateEmail } from '../../../UI/Ramp/utils/depositUtils';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import { SocialPostAppealViewSelectorsIDs } from './SocialPostAppealView.testIds';

/** The footer never sits closer to the screen edge than the page gutter. */
const MIN_FOOTER_BOTTOM_PADDING = 16;
/** Screens an appeal adds to the stack: the decision it came from and itself. */
const APPEAL_FLOW_SCREEN_COUNT = 2;

/**
 * Lets someone appeal a moderation decision: an email to hear back on and a
 * message. Submitting hands the appeal to MetaMask support, then confirms.
 * Opened from the decision screen's Appeal button.
 */
const SocialPostAppealView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } =
    useRoute<RouteProp<RootStackParamList, 'SocialPostAppealView'>>();
  const insets = useSafeAreaInsets();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled);

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [hasEmailError, setHasEmailError] = useState(false);
  const [hasSendError, setHasSendError] = useState(false);
  const [sentToEmail, setSentToEmail] = useState<string | undefined>();

  const trimmedEmail = email.trim();
  const trimmedMessage = message.trim();
  const canSubmit = trimmedEmail.length > 0 && trimmedMessage.length > 0;

  const handleBack = useCallback(() => navigation.goBack(), [navigation]);

  const handleChangeEmail = useCallback((value: string) => {
    setEmail(value);
    setHasEmailError(false);
  }, []);

  const handleChangeMessage = useCallback((value: string) => {
    setMessage(value);
    setHasSendError(false);
  }, []);

  const handleSent = useCallback(
    () => setSentToEmail(trimmedEmail),
    [trimmedEmail],
  );
  const handleFailed = useCallback(() => setHasSendError(true), []);
  const dismissSendError = useCallback(() => setHasSendError(false), []);

  const submitAppeal = useSubmitSocialAppeal({
    onSent: handleSent,
    onFailed: handleFailed,
  });

  const handleSubmit = useCallback(() => {
    if (!validateEmail(trimmedEmail)) {
      setHasEmailError(true);
      return;
    }
    setHasSendError(false);
    submitAppeal({
      email: trimmedEmail,
      message: trimmedMessage,
      decision: params.kind,
      handle: params.handle,
      reason: params.reason,
    });
  }, [params, submitAppeal, trimmedEmail, trimmedMessage]);

  const handleDone = useCallback(() => {
    const index = navigation.getState()?.index ?? 0;
    const screenCount = Math.min(APPEAL_FLOW_SCREEN_COUNT, index);
    if (screenCount > 0) {
      navigation.dispatch(StackActions.pop(screenCount));
      return;
    }
    navigation.navigate(Routes.NOTIFICATIONS.VIEW);
  }, [navigation]);

  const footerStyle = {
    paddingBottom: Math.max(insets.bottom, MIN_FOOTER_BOTTOM_PADDING),
  };

  if (sentToEmail !== undefined) {
    return (
      <SafeAreaView
        edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
        style={tw.style('flex-1 bg-default')}
        testID={SocialPostAppealViewSelectorsIDs.SUCCESS_CONTAINER}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          includesTopInset
          title=""
        />
        <Box
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Start}
          gap={4}
          twClassName="flex-1 px-4 pt-16"
        >
          <AvatarIcon
            iconName={IconName.CheckBold}
            severity={AvatarIconSeverity.Success}
            size={AvatarIconSize.Xl}
          />
          <Box gap={2} alignItems={BoxAlignItems.Center}>
            <Text
              variant={TextVariant.HeadingMd}
              accessibilityRole="header"
              twClassName="text-center"
              testID={SocialPostAppealViewSelectorsIDs.SUCCESS_TITLE}
            >
              {strings('social_leaderboard.post_appeal.success_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="text-center"
              testID={SocialPostAppealViewSelectorsIDs.SUCCESS_DESCRIPTION}
            >
              {strings('social_leaderboard.post_appeal.success_description', {
                email: sentToEmail,
              })}
            </Text>
          </Box>
        </Box>
        <Box twClassName="px-4 pt-4 bg-default" style={footerStyle}>
          <Button
            variant={ButtonVariant.Primary}
            isFullWidth
            onPress={handleDone}
            testID={SocialPostAppealViewSelectorsIDs.DONE_BUTTON}
          >
            {strings('social_leaderboard.post_appeal.done')}
          </Button>
        </Box>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={SCROLLABLE_SCREEN_SAFE_AREA_EDGES}
      style={tw.style('flex-1 bg-default')}
      testID={SocialPostAppealViewSelectorsIDs.CONTAINER}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        title=""
        onBack={handleBack}
        backButtonProps={{
          testID: SocialPostAppealViewSelectorsIDs.BACK_BUTTON,
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw.style('flex-1')}
      >
        <ScrollView
          style={tw.style('flex-1')}
          contentContainerStyle={tw.style('px-4 pt-4 pb-6 gap-6')}
          keyboardShouldPersistTaps="handled"
        >
          <Box gap={2}>
            <Text
              variant={TextVariant.HeadingLg}
              accessibilityRole="header"
              testID={SocialPostAppealViewSelectorsIDs.TITLE}
            >
              {strings('social_leaderboard.post_appeal.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {strings('social_leaderboard.post_appeal.subtitle')}
            </Text>
          </Box>

          <Box gap={2}>
            <Label>
              {strings('social_leaderboard.post_appeal.email_label')}
            </Label>
            <TextField
              value={email}
              onChangeText={handleChangeEmail}
              placeholder={strings(
                'social_leaderboard.post_appeal.email_placeholder',
              )}
              isError={hasEmailError}
              inputProps={{
                testID: SocialPostAppealViewSelectorsIDs.EMAIL_INPUT,
                keyboardType: 'email-address',
                autoCapitalize: 'none',
                autoCorrect: false,
                autoComplete: 'email',
                textContentType: 'emailAddress',
              }}
            />
            {hasEmailError ? (
              <HelpText
                severity={HelpTextSeverity.Danger}
                showIcon
                testID={SocialPostAppealViewSelectorsIDs.EMAIL_ERROR}
              >
                {strings('social_leaderboard.post_appeal.email_error')}
              </HelpText>
            ) : (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={SocialPostAppealViewSelectorsIDs.EMAIL_HELPER}
              >
                {strings('social_leaderboard.post_appeal.email_helper')}
              </Text>
            )}
          </Box>

          <Box gap={2}>
            <Label>
              {strings('social_leaderboard.post_appeal.message_label')}
            </Label>
            <TextArea
              value={message}
              onChangeText={handleChangeMessage}
              placeholder={strings(
                'social_leaderboard.post_appeal.message_placeholder',
              )}
              maxLength={SOCIAL_APPEAL_MESSAGE_MAX_LENGTH}
              testID={SocialPostAppealViewSelectorsIDs.MESSAGE_INPUT}
            />
          </Box>

          {hasSendError ? (
            <BannerAlert
              severity={BannerAlertSeverity.Danger}
              title={strings('social_leaderboard.post_appeal.error_title')}
              description={strings(
                'social_leaderboard.post_appeal.error_description',
              )}
              onClose={dismissSendError}
              closeButtonProps={{
                accessibilityLabel: strings(
                  'social_leaderboard.post_appeal.error_dismiss',
                ),
              }}
              testID={SocialPostAppealViewSelectorsIDs.ERROR_BANNER}
            />
          ) : null}
        </ScrollView>
        <Box twClassName="px-4 pt-4 bg-default" style={footerStyle}>
          <Button
            variant={ButtonVariant.Primary}
            isFullWidth
            isDisabled={!canSubmit}
            onPress={handleSubmit}
            testID={SocialPostAppealViewSelectorsIDs.SUBMIT_BUTTON}
          >
            {strings('social_leaderboard.post_appeal.submit')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SocialPostAppealView;
