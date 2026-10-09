import {
  AvatarAccount,
  AvatarAccountSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonVariant,
  FontWeight,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  RadioButton,
  Switch,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import { getAvatarAccountVariant } from '../../../../component-library/components-temp/MultichainAccounts/avatarAccountVariant';
import Routes from '../../../../constants/navigation/Routes';
import type { RootStackParamList } from '../../../../core/NavigationService/types';
import { selectAvatarAccountType } from '../../../../selectors/settings';
import { PROFILE_AVATAR_PRESETS } from '../MyProfileView/avatarPresets';
import ProfileAvatar from '../MyProfileView/components/ProfileAvatar';
import { saveLocalSocialProfile } from '../MyProfileView/hooks/localSocialProfileStore';
import { SCROLLABLE_SCREEN_SAFE_AREA_EDGES } from '../shared/scrollableScreenSafeArea';
import {
  buildOnboardedSocialProfile,
  canContinueUsernameStep,
  createInitialOnboardingDraft,
  displayNameFromUsername,
  getUsernameStatus,
  nextUsernameSuggestion,
  normalizeUsername,
  type ProfileOnboardingDraft,
  type ProfileOnboardingStep,
} from './profileOnboardingDraft';
import { SocialProfileOnboardingSelectorsIDs } from './SocialProfileOnboardingView.testIds';
import { useSocialOnboardingAccounts } from './useSocialOnboardingAccounts';

const AVATAR_GRID_COUNT = 24;

const LIVE_ACTIVITY = [
  {
    id: 'jilio',
    name: 'Jilio',
    action: 'bought' as const,
    asset: 'SOL',
    emoji: '🦊',
    seconds: null,
  },
  {
    id: 'sebastian',
    name: 'Sebastian',
    action: 'sold' as const,
    asset: 'ETH',
    emoji: '🐱',
    seconds: 2,
  },
  {
    id: 'pain',
    name: 'Pain',
    action: 'bought' as const,
    asset: 'BONK',
    emoji: '😎',
    seconds: 3,
  },
];

const progressFill = (
  step: ProfileOnboardingStep,
): readonly (0 | 0.5 | 1)[] => {
  switch (step) {
    case 'intro':
    case 'username':
      return [1, 0, 0];
    case 'avatar':
      return [1, 1, 0];
    case 'account':
      return [1, 1, 0.5];
    case 'ready':
      return [1, 1, 1];
    default:
      return [0, 0, 0];
  }
};

const fillClassName = (fill: 0 | 0.5 | 1): string => {
  if (fill === 1) {
    return 'w-full';
  }
  if (fill === 0.5) {
    return 'w-1/2';
  }
  return 'w-0';
};

const OnboardingProgress: React.FC<{ step: ProfileOnboardingStep }> = ({
  step,
}) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    gap={2}
    paddingHorizontal={4}
    paddingBottom={2}
    testID={SocialProfileOnboardingSelectorsIDs.PROGRESS}
  >
    {progressFill(step).map((fill, index) => (
      <Box
        key={`progress-${index}`}
        twClassName="flex-1 h-1 rounded-full bg-muted overflow-hidden"
      >
        <Box twClassName={`h-full bg-icon-default ${fillClassName(fill)}`} />
      </Box>
    ))}
  </Box>
);

const SocialProfileOnboardingView: React.FC = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const tw = useTailwind();
  const accounts = useSocialOnboardingAccounts();
  const avatarAccountType = useSelector(selectAvatarAccountType);
  const avatarVariant = getAvatarAccountVariant(avatarAccountType);
  const [step, setStep] = useState<ProfileOnboardingStep>('intro');
  const [draft, setDraft] = useState<ProfileOnboardingDraft>(
    createInitialOnboardingDraft,
  );

  useEffect(() => {
    if (accounts.length === 0) {
      return;
    }
    setDraft((current) => {
      if (current.linkedAccountId) {
        return current;
      }
      return {
        ...current,
        linkedAccountId: accounts[0].id,
        linkedAccountAddress: accounts[0].address,
      };
    });
  }, [accounts]);

  const handleClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleBack = useCallback(() => {
    setStep((current) => {
      switch (current) {
        case 'username':
          return 'intro';
        case 'avatar':
          return 'username';
        case 'account':
          return 'avatar';
        case 'ready':
          return 'account';
        default:
          return current;
      }
    });
  }, []);

  const handleUsernameChange = useCallback((value: string) => {
    const username = value.replace(/^@+/, '');
    setDraft((current) => ({
      ...current,
      username,
      displayName: current.displayNameEdited
        ? current.displayName
        : displayNameFromUsername(username),
    }));
  }, []);

  const handleShuffleUsername = useCallback(() => {
    setDraft((current) => {
      const username = nextUsernameSuggestion(current.username);
      return {
        ...current,
        username,
        displayName: current.displayNameEdited
          ? current.displayName
          : displayNameFromUsername(username),
      };
    });
  }, []);

  const handleDisplayNameChange = useCallback((value: string) => {
    setDraft((current) => ({
      ...current,
      displayName: value,
      displayNameEdited: true,
    }));
  }, []);

  const handleContinue = useCallback(() => {
    setStep((current) => {
      switch (current) {
        case 'username':
          return 'avatar';
        case 'avatar':
          return 'account';
        case 'account':
          return 'ready';
        default:
          return current;
      }
    });
  }, []);

  const handleFinish = useCallback(() => {
    saveLocalSocialProfile(buildOnboardedSocialProfile(draft));
    navigation.navigate(Routes.SOCIAL.V1);
  }, [draft, navigation]);

  const usernameStatus = getUsernameStatus(draft.username);
  const username = normalizeUsername(draft.username);
  const continueDisabled =
    (step === 'username' && !canContinueUsernameStep(draft)) ||
    (step === 'account' && !draft.linkedAccountId);

  return (
    <SafeAreaView
      edges={[...SCROLLABLE_SCREEN_SAFE_AREA_EDGES, 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={SocialProfileOnboardingSelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title=""
        onBack={step === 'intro' ? undefined : handleBack}
        onClose={handleClose}
        backButtonProps={{
          testID: SocialProfileOnboardingSelectorsIDs.BACK_BUTTON,
        }}
        closeButtonProps={{
          testID: SocialProfileOnboardingSelectorsIDs.CLOSE_BUTTON,
        }}
        testID={SocialProfileOnboardingSelectorsIDs.HEADER}
      />
      <OnboardingProgress step={step} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw.style('flex-1')}
      >
        <Box twClassName="flex-1">
          {step === 'intro' ? (
            <Box
              twClassName="flex-1"
              testID={SocialProfileOnboardingSelectorsIDs.INTRO}
            >
              <Text
                variant={TextVariant.HeadingLg}
                fontWeight={FontWeight.Bold}
                twClassName="text-center px-6 pt-4"
              >
                {strings('social_leaderboard.profile_onboarding.intro_title')}
              </Text>
              <Box twClassName="flex-1 justify-center px-8" gap={3}>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={2}
                  twClassName="px-2"
                >
                  <Box twClassName="w-2 h-2 rounded-full bg-error-default" />
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.live_activity',
                    )}
                  </Text>
                </Box>
                {LIVE_ACTIVITY.map((trade) => (
                  <Box
                    key={trade.id}
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={2}
                    twClassName="bg-muted rounded-full px-3 py-2"
                  >
                    <Text variant={TextVariant.BodyLg}>{trade.emoji}</Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {trade.name}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      color={
                        trade.action === 'bought'
                          ? TextColor.SuccessDefault
                          : TextColor.ErrorDefault
                      }
                    >
                      {strings(
                        `social_leaderboard.profile_onboarding.${trade.action}`,
                      )}
                    </Text>
                    <Text
                      variant={TextVariant.BodyMd}
                      fontWeight={FontWeight.Medium}
                    >
                      {trade.asset}
                    </Text>
                    <Box twClassName="flex-1" />
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {trade.seconds == null
                        ? strings(
                            'social_leaderboard.profile_onboarding.just_now',
                          )
                        : strings(
                            'social_leaderboard.profile_onboarding.seconds_ago',
                            { count: trade.seconds },
                          )}
                    </Text>
                  </Box>
                ))}
              </Box>
              <Box paddingHorizontal={4} paddingBottom={4} gap={3}>
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  startIconName={IconName.X}
                  onPress={() => undefined}
                  testID={SocialProfileOnboardingSelectorsIDs.CONNECT_X_BUTTON}
                >
                  {strings('social_leaderboard.profile_onboarding.connect_x')}
                </Button>
                <Button
                  variant={ButtonVariant.Tertiary}
                  isFullWidth
                  onPress={() => setStep('username')}
                  testID={
                    SocialProfileOnboardingSelectorsIDs.CREATE_MANUALLY_BUTTON
                  }
                >
                  {strings(
                    'social_leaderboard.profile_onboarding.create_manually',
                  )}
                </Button>
              </Box>
            </Box>
          ) : (
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={tw.style('flex-grow px-4 pb-4')}
            >
              {step === 'username' ? (
                <Box
                  gap={4}
                  testID={SocialProfileOnboardingSelectorsIDs.USERNAME_STEP}
                >
                  <Text
                    variant={TextVariant.HeadingLg}
                    fontWeight={FontWeight.Bold}
                    twClassName="text-center pt-2"
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.claim_username',
                    )}
                  </Text>
                  <Box gap={2}>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'social_leaderboard.profile_onboarding.username_label',
                      )}
                    </Text>
                    <TextField
                      value={draft.username}
                      onChangeText={handleUsernameChange}
                      isError={usernameStatus === 'invalid'}
                      startAccessory={
                        <Text
                          variant={TextVariant.BodyMd}
                          color={TextColor.TextAlternative}
                        >
                          @
                        </Text>
                      }
                      endAccessory={
                        <ButtonIcon
                          iconName={IconName.Refresh}
                          size={ButtonIconSize.Sm}
                          onPress={handleShuffleUsername}
                          accessibilityLabel={strings(
                            'social_leaderboard.profile_onboarding.shuffle_username',
                          )}
                          testID={
                            SocialProfileOnboardingSelectorsIDs.SHUFFLE_USERNAME_BUTTON
                          }
                        />
                      }
                      inputProps={{
                        autoCapitalize: 'none',
                        autoCorrect: false,
                        testID:
                          SocialProfileOnboardingSelectorsIDs.USERNAME_INPUT,
                      }}
                    />
                    {usernameStatus === 'available' ? (
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        alignItems={BoxAlignItems.Center}
                        gap={1}
                        testID={
                          SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS
                        }
                      >
                        <Icon
                          name={IconName.Check}
                          size={IconSize.Sm}
                          color={IconColor.SuccessDefault}
                        />
                        <Text
                          variant={TextVariant.BodySm}
                          color={TextColor.SuccessDefault}
                        >
                          {strings(
                            'social_leaderboard.profile_onboarding.username_available',
                            { handle: username },
                          )}
                        </Text>
                      </Box>
                    ) : null}
                    {usernameStatus === 'invalid' ? (
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.ErrorDefault}
                        testID={
                          SocialProfileOnboardingSelectorsIDs.USERNAME_STATUS
                        }
                      >
                        {strings(
                          'social_leaderboard.profile_onboarding.username_invalid',
                        )}
                      </Text>
                    ) : null}
                  </Box>
                  <Box gap={2}>
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                    >
                      {strings(
                        'social_leaderboard.profile_onboarding.display_name_label',
                      )}
                    </Text>
                    <TextField
                      value={draft.displayName}
                      onChangeText={handleDisplayNameChange}
                      endAccessory={
                        draft.displayName.trim() ? (
                          <Icon
                            name={IconName.Check}
                            size={IconSize.Sm}
                            color={IconColor.PrimaryDefault}
                          />
                        ) : undefined
                      }
                      inputProps={{
                        autoCapitalize: 'words',
                        testID:
                          SocialProfileOnboardingSelectorsIDs.DISPLAY_NAME_INPUT,
                      }}
                    />
                  </Box>
                </Box>
              ) : null}

              {step === 'avatar' ? (
                <Box
                  alignItems={BoxAlignItems.Center}
                  testID={SocialProfileOnboardingSelectorsIDs.AVATAR_STEP}
                >
                  <Text
                    variant={TextVariant.HeadingLg}
                    fontWeight={FontWeight.Bold}
                    twClassName="text-center pt-2 pb-4"
                  >
                    {strings('social_leaderboard.profile_onboarding.pick_look')}
                  </Text>
                  <Box
                    twClassName="rounded-full border-4 border-icon-default p-1 mb-4"
                    testID={SocialProfileOnboardingSelectorsIDs.AVATAR_PREVIEW}
                  >
                    <ProfileAvatar
                      avatarPresetId={draft.avatarPresetId}
                      size="xl"
                    />
                  </Box>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    justifyContent={BoxJustifyContent.Center}
                    gap={8}
                    twClassName="pb-4"
                  >
                    <Box alignItems={BoxAlignItems.Center} gap={2}>
                      <ButtonIcon
                        iconName={IconName.Camera}
                        variant={ButtonIconVariant.Filled}
                        size={ButtonIconSize.Lg}
                        onPress={() => undefined}
                        accessibilityLabel={strings(
                          'social_leaderboard.profile_onboarding.camera',
                        )}
                        testID={
                          SocialProfileOnboardingSelectorsIDs.CAMERA_BUTTON
                        }
                      />
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {strings(
                          'social_leaderboard.profile_onboarding.camera',
                        )}
                      </Text>
                    </Box>
                    <Box alignItems={BoxAlignItems.Center} gap={2}>
                      <ButtonIcon
                        iconName={IconName.Image}
                        variant={ButtonIconVariant.Filled}
                        size={ButtonIconSize.Lg}
                        onPress={() => undefined}
                        accessibilityLabel={strings(
                          'social_leaderboard.profile_onboarding.photos',
                        )}
                        testID={
                          SocialProfileOnboardingSelectorsIDs.PHOTOS_BUTTON
                        }
                      />
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {strings(
                          'social_leaderboard.profile_onboarding.photos',
                        )}
                      </Text>
                    </Box>
                  </Box>
                  <Box twClassName="flex-row flex-wrap justify-center w-full">
                    {Array.from({ length: AVATAR_GRID_COUNT }, (_, index) => {
                      const preset =
                        PROFILE_AVATAR_PRESETS[
                          index % PROFILE_AVATAR_PRESETS.length
                        ];
                      const isSelected = draft.avatarGridIndex === index;
                      return (
                        <Pressable
                          key={`${preset.id}-${index}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          onPress={() =>
                            setDraft((current) => ({
                              ...current,
                              avatarPresetId: preset.id,
                              avatarGridIndex: index,
                            }))
                          }
                          testID={`${SocialProfileOnboardingSelectorsIDs.AVATAR_OPTION}-${index}`}
                          style={tw.style('m-1')}
                        >
                          <Box
                            twClassName={`rounded-full p-0.5 ${
                              isSelected
                                ? 'border-2 border-icon-default'
                                : 'border-2 border-transparent'
                            }`}
                          >
                            <ProfileAvatar
                              avatarPresetId={preset.id}
                              size="md"
                            />
                          </Box>
                        </Pressable>
                      );
                    })}
                  </Box>
                </Box>
              ) : null}

              {step === 'account' ? (
                <Box
                  gap={4}
                  testID={SocialProfileOnboardingSelectorsIDs.ACCOUNT_STEP}
                >
                  <Text
                    variant={TextVariant.HeadingLg}
                    fontWeight={FontWeight.Bold}
                    twClassName="text-center pt-2"
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.link_account',
                    )}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.link_account_description',
                    )}
                  </Text>
                  <Box twClassName="bg-muted rounded-2xl overflow-hidden">
                    {accounts.map((account, index) => {
                      const isSelected = draft.linkedAccountId === account.id;
                      return (
                        <Pressable
                          key={account.id}
                          accessibilityRole="button"
                          onPress={() =>
                            setDraft((current) => ({
                              ...current,
                              linkedAccountId: account.id,
                              linkedAccountAddress: account.address,
                            }))
                          }
                          testID={`${SocialProfileOnboardingSelectorsIDs.ACCOUNT_ROW}-${account.id}`}
                        >
                          <Box
                            flexDirection={BoxFlexDirection.Row}
                            alignItems={BoxAlignItems.Center}
                            justifyContent={BoxJustifyContent.Between}
                            twClassName={`px-4 py-3 ${
                              index > 0 ? 'border-t border-muted' : ''
                            }`}
                          >
                            <Box
                              flexDirection={BoxFlexDirection.Row}
                              alignItems={BoxAlignItems.Center}
                              twClassName="flex-1 min-w-0 mr-3"
                              gap={3}
                            >
                              <AvatarAccount
                                address={account.address}
                                size={AvatarAccountSize.Md}
                                variant={avatarVariant}
                              />
                              <Box twClassName="flex-1 min-w-0">
                                <Text
                                  variant={TextVariant.BodyMd}
                                  fontWeight={FontWeight.Medium}
                                  numberOfLines={1}
                                >
                                  {account.name}
                                </Text>
                                {account.balanceLabel ? (
                                  <Text
                                    variant={TextVariant.BodySm}
                                    color={TextColor.TextAlternative}
                                  >
                                    {account.balanceLabel}
                                  </Text>
                                ) : null}
                              </Box>
                            </Box>
                            <RadioButton
                              isChecked={isSelected}
                              onPress={() =>
                                setDraft((current) => ({
                                  ...current,
                                  linkedAccountId: account.id,
                                  linkedAccountAddress: account.address,
                                }))
                              }
                            />
                          </Box>
                        </Pressable>
                      );
                    })}
                  </Box>
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    justifyContent={BoxJustifyContent.Between}
                    gap={3}
                  >
                    <Box twClassName="flex-1" gap={1}>
                      <Text
                        variant={TextVariant.HeadingSm}
                        fontWeight={FontWeight.Bold}
                      >
                        {strings(
                          'social_leaderboard.profile_onboarding.share_trading_activity',
                        )}
                      </Text>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {strings(
                          'social_leaderboard.profile_onboarding.share_trading_activity_description',
                        )}
                      </Text>
                    </Box>
                    <Switch
                      isOn={draft.shareTradingActivity}
                      onValueChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          shareTradingActivity: value,
                        }))
                      }
                      testID={
                        SocialProfileOnboardingSelectorsIDs.SHARE_ACTIVITY_SWITCH
                      }
                    />
                  </Box>
                </Box>
              ) : null}

              {step === 'ready' ? (
                <Box
                  twClassName="relative flex-1 items-center justify-center py-8"
                  testID={SocialProfileOnboardingSelectorsIDs.READY_STEP}
                >
                  <Text
                    twClassName="absolute left-6 top-6"
                    variant={TextVariant.HeadingLg}
                  >
                    🦊
                  </Text>
                  <Text
                    twClassName="absolute right-8 top-10"
                    variant={TextVariant.HeadingMd}
                  >
                    ✨
                  </Text>
                  <Text
                    twClassName="absolute left-10 bottom-16"
                    variant={TextVariant.HeadingMd}
                  >
                    🐱
                  </Text>
                  <Text
                    variant={TextVariant.HeadingLg}
                    fontWeight={FontWeight.Bold}
                    twClassName="text-center"
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.feed_awaits',
                    )}
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                    twClassName="text-center pt-3 px-4"
                  >
                    {strings(
                      'social_leaderboard.profile_onboarding.feed_awaits_description',
                    )}
                  </Text>
                  <Box alignItems={BoxAlignItems.Center} twClassName="pt-10">
                    <Box twClassName="bg-success-muted rounded-full px-4 py-2 mb-2">
                      <Text
                        variant={TextVariant.BodyMd}
                        fontWeight={FontWeight.Medium}
                      >
                        {strings('social_leaderboard.profile_onboarding.hi')}
                      </Text>
                    </Box>
                    <Box twClassName="rounded-full border-4 border-success-default p-1">
                      <ProfileAvatar
                        avatarPresetId={draft.avatarPresetId}
                        size="xl"
                      />
                    </Box>
                    <Text
                      variant={TextVariant.BodyMd}
                      twClassName="pt-3"
                      testID={SocialProfileOnboardingSelectorsIDs.READY_HANDLE}
                    >
                      @{username}
                    </Text>
                  </Box>
                </Box>
              ) : null}
            </ScrollView>
          )}

          {step !== 'intro' ? (
            <Box paddingHorizontal={4} paddingBottom={4}>
              {step === 'ready' ? (
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  onPress={handleFinish}
                  testID={SocialProfileOnboardingSelectorsIDs.LETS_GO_BUTTON}
                >
                  {strings('social_leaderboard.profile_onboarding.lets_go')}
                </Button>
              ) : (
                <Button
                  variant={ButtonVariant.Primary}
                  isFullWidth
                  isDisabled={continueDisabled}
                  onPress={handleContinue}
                  testID={SocialProfileOnboardingSelectorsIDs.CONTINUE_BUTTON}
                >
                  {strings('social_leaderboard.profile_onboarding.continue')}
                </Button>
              )}
            </Box>
          ) : null}
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default SocialProfileOnboardingView;
