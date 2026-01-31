import React, { useCallback } from 'react';
import { ScrollView, View, StatusBar } from 'react-native';
import {
  Text,
  ButtonIcon,
  TextVariant,
  IconName,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../component-library/components/Buttons/Button';
import { useNavigation, useTheme } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { strings } from '../../../../../locales/i18n';
import {
  skipProfileSetup,
  USERNAME_SUFFIX,
} from '../../../../core/redux/slices/userProfile';
import { useStyles } from '../../../../component-library/hooks';
import Routes from '../../../../constants/navigation/Routes';
import styleSheet from './UserProfileOptIn.styles.ts';
import { USER_PROFILE_OPT_IN_TEST_IDS } from './UserProfileOptIn.testIds.ts';
import LottieView from 'lottie-react-native';
// Using the same animation style as multichain accounts intro for consistency
import profileAnimation from '../../../../animations/Multichain_Accounts.json';

const UserProfileOptIn = () => {
  const { styles } = useStyles(styleSheet, { theme: useTheme() });
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const handleClose = useCallback(() => {
    dispatch(skipProfileSetup());
    navigation.goBack();
  }, [navigation, dispatch]);

  const handleCreateProfile = useCallback(() => {
    navigation.goBack();
    navigation.navigate(Routes.USER_PROFILE.CLAIM_USERNAME);
  }, [navigation]);

  const handleSkip = useCallback(() => {
    dispatch(skipProfileSetup());
    navigation.goBack();
  }, [navigation, dispatch]);

  return (
    <View style={styles.screen}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text
            variant={TextVariant.BodyMd}
            style={styles.title}
            testID={USER_PROFILE_OPT_IN_TEST_IDS.TITLE}
          >
            {strings('user_profile.opt_in.header_title')}
          </Text>
          <ButtonIcon
            onPress={handleClose}
            iconName={IconName.Close}
            testID={USER_PROFILE_OPT_IN_TEST_IDS.CLOSE_BUTTON}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <LottieView
            style={styles.imagePlaceholder}
            autoPlay
            loop
            source={profileAnimation}
            testID={USER_PROFILE_OPT_IN_TEST_IDS.IMAGE_PLACEHOLDER}
          />

          <View style={styles.section}>
            <Text
              variant={TextVariant.HeadingMd}
              style={styles.sectionTitle}
              testID={USER_PROFILE_OPT_IN_TEST_IDS.MAIN_TITLE}
            >
              {strings('user_profile.opt_in.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.sectionDescription}
              testID={USER_PROFILE_OPT_IN_TEST_IDS.DESCRIPTION}
            >
              {strings('user_profile.opt_in.description_prefix')}
              <Text fontWeight={FontWeight.Bold}>{USERNAME_SUFFIX}</Text>
              {strings('user_profile.opt_in.description_suffix')}
            </Text>

            <Text
              variant={TextVariant.HeadingMd}
              style={styles.sectionTitle}
              testID={USER_PROFILE_OPT_IN_TEST_IDS.PRIVACY_TITLE}
            >
              {strings('user_profile.opt_in.privacy_title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              style={styles.sectionDescription}
              color={TextColor.TextAlternative}
              testID={USER_PROFILE_OPT_IN_TEST_IDS.PRIVACY_DESCRIPTION}
            >
              {strings('user_profile.opt_in.privacy_description')}
            </Text>
          </View>
        </ScrollView>

        <View style={styles.buttonsContainer}>
          <Button
            variant={ButtonVariants.Primary}
            label={strings('user_profile.opt_in.create_profile_button')}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleCreateProfile}
            testID={USER_PROFILE_OPT_IN_TEST_IDS.CREATE_PROFILE_BUTTON}
          />
          <Button
            variant={ButtonVariants.Link}
            label={strings('user_profile.opt_in.skip_button')}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            onPress={handleSkip}
            testID={USER_PROFILE_OPT_IN_TEST_IDS.SKIP_BUTTON}
          />
        </View>
      </View>
    </View>
  );
};

export default UserProfileOptIn;
