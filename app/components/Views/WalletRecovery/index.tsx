import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../../util/theme';
import Text, {
  TextVariant,
  TextColor,
} from '../../../component-library/components/Texts/Text';
import { strings } from '../../../../locales/i18n';
import { getNavigationOptionsTitle } from '../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';
import SelectSRP from '../SelectSRP';
import { useSelector } from 'react-redux';
import {
  selectSeedlessOnboardingAuthConnection,
  selectSeedlessOnboardingUserEmail,
  selectSeedlessOnboardingUserId,
} from '../../../selectors/seedlessOnboardingController';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../component-library/components/Icons/Icon';
import GoogleIcon from 'images/google.svg';
import AppleIcon from 'images/apple.svg';
import AppleWhiteIcon from 'images/apple-white.svg';
import { AppThemeKey } from '../../../util/theme/models';
import { AuthConnection } from '@metamask/seedless-onboarding-controller';
import { capitalize } from 'lodash';

const SocialNotLinked = () => {
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    box: {
      backgroundColor: colors.background.muted,
      padding: 16,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    boxRight: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
  });

  return (
    <View style={styles.box}>
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
        {strings('protect_your_wallet.login_with_social')}
      </Text>
      <View style={styles.boxRight}>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Error}>
          {strings('protect_your_wallet.setup')}
        </Text>
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Lg}
          color={IconColor.Alternative}
        />
      </View>
    </View>
  );
};

const SocialLinked = ({
  email,
  authConnection,
}: {
  email: string;
  authConnection: string;
}) => {
  const { colors, themeAppearance } = useTheme();
  const styles = StyleSheet.create({
    socialDetailsBoxRoot: {
      width: '100%',
    },
    socialDetailsBoxRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
      flex: 1,
    },
    socialBoxContainer: {
      backgroundColor: colors.background.muted,
      padding: 16,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      columnGap: 8,
    },
    iconContainer: {
      marginRight: 8,
    },
    socialDetailsBoxContent: {
      flexDirection: 'column',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    emailText: {
      width: '100%',
    },
  });

  const isDark = themeAppearance === AppThemeKey.dark;

  const maskedEmail = useMemo(() => {
    if (!email.includes('@')) {
      return email;
    }
    const [firstPart, secondPart] = email.split('@');
    return `${firstPart.slice(0, 1)}********@${secondPart}`;
  }, [email]);

  const getSocialIcon = () => {
    if (authConnection === AuthConnection.Google) {
      return (
        <GoogleIcon
          name="google"
          width={24}
          height={24}
          fill="currentColor"
          color={colors.icon.default}
        />
      );
    }

    if (isDark && authConnection === AuthConnection.Apple) {
      return (
        <AppleWhiteIcon
          fill="currentColor"
          width={24}
          height={24}
          name={'apple-white'}
        />
      );
    }

    return (
      <AppleIcon fill="currentColor" width={24} height={24} name={'apple'} />
    );
  };

  return (
    <View style={styles.socialDetailsBoxRoot}>
      <View style={styles.socialBoxContainer}>
        <View style={styles.iconContainer}>{getSocialIcon()}</View>
        <View style={styles.socialDetailsBoxContent}>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('protect_your_wallet.social_recovery_enable')}
          </Text>
          {!!email && (
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Alternative}
              style={styles.emailText}
            >
              {maskedEmail}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const WalletRecovery = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);
  const userEmail = useSelector(selectSeedlessOnboardingUserEmail);
  const seedlessOnboardingUserId = useSelector(selectSeedlessOnboardingUserId);

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: 'column',
      rowGap: 24,
      paddingVertical: 8,
    },
    socialBox: {
      padding: 16,
      marginHorizontal: 8,
    },
    box: {
      backgroundColor: colors.background.muted,
      padding: 16,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    boxRight: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    socialTitle: {
      marginBottom: 16,
    },
    socialContainer: {
      paddingHorizontal: 16,
      display: 'flex',
      flexDirection: 'column',
      rowGap: 8,
    },
    socialDetailsBox: {
      flexDirection: 'column',
      rowGap: 8,
      backgroundColor: colors.background.muted,
      padding: 16,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border.muted,
    },
    socialDetailsBoxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      columnGap: 8,
    },

    socialDetailsBoxRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      columnGap: 8,
    },
    lineBreak: {
      height: 1,
      backgroundColor: colors.border.muted,
      paddingHorizontal: 16,
    },
    lineBreakContainer: {
      paddingHorizontal: 16,
    },
    bottomContainer: {
      paddingHorizontal: 24,
    },
    srpContainer: {
      flexDirection: 'column',
      rowGap: 6,
    },
    srpTitle: {
      paddingHorizontal: 16,
    },
    srpListContainer: {
      paddingVertical: 0,
      paddingHorizontal: 16,
      margin: 0,
    },
  });

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('app_settings.manage_recovery_method'),
        navigation,
        false,
        colors,
      ),
    );
  }, [navigation, colors]);

  const [finalUserEmail, setFinalUserEmail] = useState(userEmail);
  useEffect(() => {
    if (userEmail) {
      if (userEmail.endsWith('@privaterelay.appleid.com')) {
        setFinalUserEmail('');
      } else {
        setFinalUserEmail(userEmail);
      }
    }
  }, [userEmail]);

  return (
    <ScrollView>
      <View style={styles.root}>
        {authConnection && (
          <View style={styles.socialContainer}>
            <Text
              variant={TextVariant.BodySMMedium}
              color={TextColor.Alternative}
            >
              {strings('protect_your_wallet.social_recovery_title', {
                authConnection: authConnection
                  ? authConnection.toUpperCase()
                  : 'GOOGLE OR APPLE',
              })}
            </Text>
            {authConnection && seedlessOnboardingUserId ? (
              <SocialLinked
                email={finalUserEmail || ''}
                authConnection={authConnection}
              />
            ) : (
              <SocialNotLinked />
            )}
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              {strings('protect_your_wallet.social_login_description', {
                authConnection: capitalize(authConnection) || 'Google',
              })}
            </Text>
          </View>
        )}

        {authConnection && (
          <View style={styles.lineBreakContainer}>
            <View style={styles.lineBreak} />
          </View>
        )}

        <View style={styles.srpContainer}>
          <Text
            variant={TextVariant.BodySMMedium}
            color={TextColor.Alternative}
            style={styles.srpTitle}
          >
            {strings('protect_your_wallet.srps_title')}
          </Text>
          <SelectSRP
            containerStyle={styles.srpListContainer}
            showArrowName={strings('protect_your_wallet.reveal')}
          />
        </View>
      </View>
    </ScrollView>
  );
};

export default WalletRecovery;
