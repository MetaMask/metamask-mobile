import React, { useCallback, useState, useEffect } from 'react';
import { ScrollView, View, TextInput, ActivityIndicator } from 'react-native';
import {
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import {
  useNavigation,
  useTheme,
  useRoute,
  RouteProp,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import {
  completeProfileSetup,
  setIsCheckingAvailability,
  setIsClaimingUsername,
  selectIsCheckingAvailability,
  selectIsClaimingUsername,
  selectPrivacyMode,
  PrivacyMode,
  USERNAME_SUFFIX,
} from '../../../../core/redux/slices/userProfile';
import { useStyles } from '../../../../component-library/hooks';
import styleSheet from './ClaimUsername.styles.ts';
import { CLAIM_USERNAME_TEST_IDS } from './ClaimUsername.testIds.ts';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNavigationOptionsTitle } from '../../../UI/Navbar';

interface ClaimUsernameParams {
  editMode?: boolean;
  currentUsername?: string;
}

// Mock username availability check (simulates API call)
const checkUsernameAvailability = async (
  username: string,
): Promise<{ available: boolean; valid: boolean }> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Simple validation
  if (username.length < 3) {
    return { available: false, valid: false };
  }

  // Mock: usernames starting with "taken" are unavailable
  if (username.toLowerCase().startsWith('taken')) {
    return { available: false, valid: true };
  }

  return { available: true, valid: true };
};

const ClaimUsername = () => {
  const { styles, theme } = useStyles(styleSheet, { theme: useTheme() });
  const { colors } = theme;
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: ClaimUsernameParams }, 'params'>>();
  const dispatch = useDispatch();

  // Get route params for edit mode
  const editMode = route.params?.editMode ?? false;
  const currentUsername = route.params?.currentUsername ?? '';

  const [username, setUsername] = useState(editMode ? currentUsername : '');
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isValid, setIsValid] = useState(true);

  // In edit mode, use current privacy mode; otherwise default to 'private'
  const currentPrivacyMode = useSelector(selectPrivacyMode);
  const [selectedPrivacy, setSelectedPrivacy] = useState<PrivacyMode>(
    editMode ? currentPrivacyMode : 'private',
  );

  const isCheckingAvailability = useSelector(selectIsCheckingAvailability);
  const isClaimingUsername = useSelector(selectIsClaimingUsername);

  // Set up navigation options
  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        editMode
          ? strings('user_profile.claim_username.edit_header_title')
          : strings('user_profile.claim_username.header_title'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors, editMode]);

  // Debounced username availability check
  useEffect(() => {
    if (username.length === 0) {
      setIsAvailable(null);
      setIsValid(true);
      return;
    }

    // In edit mode, if username is the same as current, it's automatically available
    if (editMode && username === currentUsername) {
      setIsAvailable(true);
      setIsValid(true);
      return;
    }

    const timeoutId = setTimeout(async () => {
      dispatch(setIsCheckingAvailability(true));
      try {
        const result = await checkUsernameAvailability(username);
        setIsAvailable(result.available);
        setIsValid(result.valid);
      } finally {
        dispatch(setIsCheckingAvailability(false));
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [username, dispatch, editMode, currentUsername]);

  const handleUsernameChange = useCallback((text: string) => {
    // Remove spaces and special characters, keep alphanumeric and underscores
    const sanitized = text.replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(sanitized);
  }, []);

  const handleClaimUsername = useCallback(async () => {
    if (!isAvailable || !isValid || isClaimingUsername) return;

    dispatch(setIsClaimingUsername(true));

    try {
      // Simulate API call to claim username
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Complete the profile setup
      dispatch(
        completeProfileSetup({
          username,
          privacyMode: selectedPrivacy,
        }),
      );

      navigation.goBack();
    } finally {
      dispatch(setIsClaimingUsername(false));
    }
  }, [
    username,
    selectedPrivacy,
    isAvailable,
    isValid,
    isClaimingUsername,
    dispatch,
    navigation,
  ]);

  const handleCancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const renderAvailabilityStatus = () => {
    if (username.length === 0) return null;

    if (isCheckingAvailability) {
      return (
        <View style={styles.statusContainer}>
          <ActivityIndicator size="small" color={colors.primary.default} />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('user_profile.claim_username.checking_availability')}
          </Text>
        </View>
      );
    }

    if (!isValid) {
      return (
        <View style={styles.statusContainer}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Sm}
            color={IconColor.ErrorDefault}
          />
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {strings('user_profile.claim_username.username_invalid')}
          </Text>
        </View>
      );
    }

    if (isAvailable === true) {
      return (
        <View style={styles.statusContainer}>
          <Icon
            name={IconName.Check}
            size={IconSize.Sm}
            color={IconColor.SuccessDefault}
          />
          <Text variant={TextVariant.BodySm} color={TextColor.SuccessDefault}>
            {strings('user_profile.claim_username.username_available')}
          </Text>
        </View>
      );
    }

    if (isAvailable === false) {
      return (
        <View style={styles.statusContainer}>
          <Icon
            name={IconName.Danger}
            size={IconSize.Sm}
            color={IconColor.ErrorDefault}
          />
          <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
            {strings('user_profile.claim_username.username_taken')}
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderPrivacyOption = (
    mode: PrivacyMode,
    title: string,
    description: string,
  ) => {
    const isSelected = selectedPrivacy === mode;
    return (
      <View
        style={[
          styles.privacyOption,
          isSelected && styles.privacyOptionSelected,
        ]}
        onTouchEnd={() => setSelectedPrivacy(mode)}
        testID={`${CLAIM_USERNAME_TEST_IDS.PRIVACY_OPTION}-${mode}`}
      >
        <View style={styles.privacyOptionHeader}>
          <View
            style={[
              styles.radioButton,
              isSelected && styles.radioButtonSelected,
            ]}
          >
            {isSelected && <View style={styles.radioButtonInner} />}
          </View>
          <Text variant={TextVariant.BodyMd}>{title}</Text>
        </View>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          style={styles.privacyOptionDescription}
        >
          {description}
        </Text>
      </View>
    );
  };

  const canClaim =
    isAvailable === true &&
    isValid &&
    !isClaimingUsername &&
    username.length > 0;

  return (
    <SafeAreaView edges={['bottom']} style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text
            variant={TextVariant.HeadingMd}
            style={styles.sectionTitle}
            testID={CLAIM_USERNAME_TEST_IDS.TITLE}
          >
            {strings('user_profile.claim_username.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.sectionDescription}
          >
            {strings('user_profile.claim_username.description')}
          </Text>

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={handleUsernameChange}
              placeholder={strings(
                'user_profile.claim_username.input_placeholder',
              )}
              placeholderTextColor={colors.text.muted}
              autoCapitalize="none"
              autoCorrect={false}
              testID={CLAIM_USERNAME_TEST_IDS.USERNAME_INPUT}
            />
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.suffix}
            >
              {USERNAME_SUFFIX}
            </Text>
          </View>

          {renderAvailabilityStatus()}
        </View>

        <View style={styles.section}>
          <Text
            variant={TextVariant.HeadingMd}
            style={styles.sectionTitle}
            testID={CLAIM_USERNAME_TEST_IDS.PRIVACY_SECTION_TITLE}
          >
            {strings('user_profile.claim_username.privacy_section_title')}
          </Text>

          {renderPrivacyOption(
            'private',
            strings('user_profile.claim_username.privacy_private_title'),
            strings('user_profile.claim_username.privacy_private_description'),
          )}

          {renderPrivacyOption(
            'public',
            strings('user_profile.claim_username.privacy_public_title'),
            strings('user_profile.claim_username.privacy_public_description'),
          )}
        </View>
      </ScrollView>

      <View style={styles.buttonsContainer}>
        <Button
          variant={ButtonVariants.Primary}
          label={
            isClaimingUsername
              ? editMode
                ? strings('user_profile.claim_username.updating')
                : strings('user_profile.claim_username.claiming')
              : editMode
                ? strings('user_profile.claim_username.update_button')
                : strings('user_profile.claim_username.claim_button')
          }
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          onPress={handleClaimUsername}
          isDisabled={!canClaim}
          testID={CLAIM_USERNAME_TEST_IDS.CLAIM_BUTTON}
        />
        <Button
          variant={ButtonVariants.Link}
          label={strings('user_profile.claim_username.cancel_button')}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          onPress={handleCancel}
          testID={CLAIM_USERNAME_TEST_IDS.CANCEL_BUTTON}
        />
      </View>
    </SafeAreaView>
  );
};

export default ClaimUsername;
