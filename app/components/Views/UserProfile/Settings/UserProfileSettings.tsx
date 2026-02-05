import React, { useCallback, useEffect } from 'react';
import { ScrollView, View, Switch } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import {
  selectUsername,
  selectFullHandle,
  selectPrivacyMode,
  selectIsProfileEnabled,
  setPrivacyMode,
  resetUserProfileState,
  PrivacyMode,
} from '../../../../core/redux/slices/userProfile';
import { useStyles } from '../../../../component-library/hooks';
import Routes from '../../../../constants/navigation/Routes';
import styleSheet from './UserProfileSettings.styles.ts';
import { USER_PROFILE_SETTINGS_TEST_IDS } from './UserProfileSettings.testIds.ts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';

const UserProfileSettings = () => {
  const { styles, theme } = useStyles(styleSheet, { theme: useTheme() });
  const { colors } = theme;
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const username = useSelector(selectUsername);
  const fullHandle = useSelector(selectFullHandle);
  const privacyMode = useSelector(selectPrivacyMode);
  const isProfileEnabled = useSelector(selectIsProfileEnabled);

  // Set up navigation options
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('user_profile.settings.title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  const handleClaimUsername = useCallback(() => {
    navigation.navigate(Routes.USER_PROFILE.CLAIM_USERNAME);
  }, [navigation]);

  const handleEditUsername = useCallback(() => {
    navigation.navigate(Routes.USER_PROFILE.CLAIM_USERNAME, {
      editMode: true,
      currentUsername: username,
    });
  }, [navigation, username]);

  const handlePrivacyToggle = useCallback(
    (value: boolean) => {
      const newMode: PrivacyMode = value ? 'public' : 'private';
      dispatch(setPrivacyMode(newMode));
    },
    [dispatch],
  );

  const handleDisableProfile = useCallback(() => {
    dispatch(resetUserProfileState());
    navigation.goBack();
  }, [dispatch, navigation]);

  const handleDevReset = useCallback(() => {
    dispatch(resetUserProfileState());
    // Navigate back to wallet to trigger the opt-in flow
    navigation.navigate(Routes.WALLET.HOME);
  }, [dispatch, navigation]);

  const isPublic = privacyMode === 'public';

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Username Section */}
        <View style={styles.section}>
          <Text
            variant={TextVariant.HeadingMd}
            style={styles.sectionTitle}
            testID={USER_PROFILE_SETTINGS_TEST_IDS.USERNAME_SECTION_TITLE}
          >
            {strings('user_profile.settings.username_section_title')}
          </Text>

          {isProfileEnabled && username ? (
            <View style={styles.usernameContainer}>
              <View style={styles.usernameRow}>
                <Text
                  variant={TextVariant.BodyLg}
                  testID={USER_PROFILE_SETTINGS_TEST_IDS.USERNAME_DISPLAY}
                >
                  {fullHandle}
                </Text>
                <Button
                  variant={ButtonVariants.Link}
                  label={strings('user_profile.settings.edit_button')}
                  size={ButtonSize.Sm}
                  onPress={handleEditUsername}
                  testID={USER_PROFILE_SETTINGS_TEST_IDS.EDIT_USERNAME_BUTTON}
                />
              </View>
            </View>
          ) : (
            <View style={styles.noUsernameContainer}>
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
                style={styles.noUsernameText}
              >
                {strings('user_profile.settings.no_username')}
              </Text>
              <Button
                variant={ButtonVariants.Secondary}
                label={strings('user_profile.settings.claim_username_button')}
                size={ButtonSize.Md}
                onPress={handleClaimUsername}
                testID={USER_PROFILE_SETTINGS_TEST_IDS.CLAIM_USERNAME_BUTTON}
              />
            </View>
          )}
        </View>

        {/* Privacy Section - Only show if profile is enabled */}
        {isProfileEnabled && username && (
          <View style={styles.section}>
            <Text
              variant={TextVariant.HeadingMd}
              style={styles.sectionTitle}
              testID={USER_PROFILE_SETTINGS_TEST_IDS.PRIVACY_SECTION_TITLE}
            >
              {strings('user_profile.settings.privacy_section_title')}
            </Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text variant={TextVariant.BodyMd}>
                  {strings('user_profile.settings.privacy_mode_label')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {isPublic
                    ? strings('user_profile.settings.privacy_public')
                    : strings('user_profile.settings.privacy_private')}
                </Text>
              </View>
              <Switch
                value={isPublic}
                onValueChange={handlePrivacyToggle}
                trackColor={{
                  false: colors.background.alternative,
                  true: colors.primary.default,
                }}
                thumbColor={colors.background.default}
                testID={USER_PROFILE_SETTINGS_TEST_IDS.PRIVACY_TOGGLE}
              />
            </View>
          </View>
        )}

        {/* Disable Profile Section - Only show if profile is enabled */}
        {isProfileEnabled && username && (
          <View style={styles.section}>
            <View style={styles.dangerSection}>
              <Text variant={TextVariant.BodyMd} color={TextColor.ErrorDefault}>
                {strings('user_profile.settings.disable_profile_title')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                style={styles.dangerDescription}
              >
                {strings('user_profile.settings.disable_profile_description')}
              </Text>
              <Button
                variant={ButtonVariants.Secondary}
                label={strings('user_profile.settings.disable_profile_title')}
                size={ButtonSize.Md}
                isDanger
                onPress={handleDisableProfile}
                testID={USER_PROFILE_SETTINGS_TEST_IDS.DISABLE_PROFILE_BUTTON}
              />
            </View>
          </View>
        )}

        {/* Developer Settings - Only show in dev builds */}
        {__DEV__ && (
          <View style={styles.section}>
            <View style={styles.devSection}>
              <Text variant={TextVariant.HeadingMd} style={styles.sectionTitle}>
                {strings('user_profile.settings.dev_section_title')}
              </Text>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                style={styles.devDescription}
              >
                {strings('user_profile.settings.dev_reset_description')}
              </Text>
              <Button
                variant={ButtonVariants.Secondary}
                label={strings('user_profile.settings.dev_reset_button')}
                size={ButtonSize.Md}
                onPress={handleDevReset}
                testID={USER_PROFILE_SETTINGS_TEST_IDS.DEV_RESET_BUTTON}
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default UserProfileSettings;
