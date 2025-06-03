import React, { useEffect, useState } from 'react';
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
  const { colors } = useTheme();
  const styles = StyleSheet.create({
    socialDetailsBoxRoot: {
      width: '100%',
      paddingVertical: 16,
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
  });

  return (
    <View style={styles.socialDetailsBoxRoot}>
      <View style={styles.socialBoxContainer}>
        <View style={styles.iconContainer}>
          <Icon
            name={
              authConnection === 'google' ? IconName.Google : IconName.Apple
            }
            size={IconSize.Lg}
            color={IconColor.Alternative}
          />
        </View>
        <View>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            {strings('protect_your_wallet.social_recovery_enable')}
          </Text>
          {!!email && <Text>{email}</Text>}
        </View>
      </View>
    </View>
  );
};

const ProtectYourWallet = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const authConnection = useSelector(selectSeedlessOnboardingAuthConnection);
  const userEmail = useSelector(selectSeedlessOnboardingUserEmail);
  const seedlessOnboardingUserId = useSelector(selectSeedlessOnboardingUserId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const styles = StyleSheet.create({
    root: {
      flex: 1,
      flexDirection: 'column',
      rowGap: 24,
      paddingVertical: 24,
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
      paddingHorizontal: 24,
    },
    authContainer: {
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
      paddingHorizontal: 24,
    },
    lineBreakContainer: {
      paddingHorizontal: 24,
    },
    bottomContainer: {
      paddingHorizontal: 24,
    },
    srpContainer: {
      flexDirection: 'column',
      rowGap: 8,
    },
    srpTitle: {
      paddingHorizontal: 24,
    },
    srpListContainer: {
      paddingVertical: 8,
    },
  });

  useEffect(() => {
    navigation.setOptions(
      getNavigationOptionsTitle(
        strings('protect_your_wallet.title'),
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
            <View style={styles.authContainer}>
              <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
                {strings('protect_your_wallet.social_recovery_title', {
                  authConnection: authConnection
                    ? authConnection.toUpperCase()
                    : 'GOOGLE OR APPLE',
                })}
              </Text>
              {authConnection && seedlessOnboardingUserId ? (
                <SocialLinked
                  email={finalUserEmail}
                  authConnection={authConnection}
                />
              ) : (
                <SocialNotLinked />
              )}
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {strings('protect_your_wallet.social_login_description', {
                  authConnection: authConnection || 'Google',
                })}
              </Text>
            </View>
          </View>
        )}

        {authConnection && (
          <View style={styles.lineBreakContainer}>
            <View style={styles.lineBreak} />
          </View>
        )}

        <View style={styles.srpContainer}>
          <Text
            variant={TextVariant.BodyMD}
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

        <View style={styles.lineBreakContainer}>
          <View style={styles.lineBreak} />
        </View>

        <View style={styles.bottomContainer}>
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('protect_your_wallet.srps_description')}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ProtectYourWallet;
