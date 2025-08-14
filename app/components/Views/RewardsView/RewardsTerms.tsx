import React, { useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../../util/theme';
import type { Colors } from '../../../util/theme/models';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import MorphText, {
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { selectSelectedInternalAccountAddress } from '../../../selectors/accountsController';
import Identicon from '../../UI/Identicon';
import { renderShortAddress } from '../../../util/address';
import { useRewardsAuth } from '../../../core/Engine/controllers/rewards-controller/hooks/useRewardsAuth';
import Routes from '../../../constants/navigation/Routes';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      backgroundColor: colors.background.default,
      paddingHorizontal: 16,
      paddingVertical: 24,
    },
    headerContainer: {
      marginBottom: 12,
    },
    title: {
      marginBottom: 8,
      textAlign: 'center',
    },
    termsTitle: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text.default,
      marginBottom: 12,
      textAlign: 'center',
    },
    termsContainer: {
      flex: 1,
      marginBottom: 24,
    },
    termsText: {
      fontSize: 16,
      lineHeight: 24,
      color: colors.text.alternative,
      marginBottom: 12,
      textAlignVertical: 'center',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text.default,
      marginTop: 16,
      marginBottom: 8,
    },
    buttonContainer: {
      gap: 12,
    },
    addressContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      padding: 16,
      backgroundColor: colors.background.muted,
      borderRadius: 8,
    },
    addressBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background.muted,
      borderRadius: 20,
      paddingHorizontal: 6,
      paddingVertical: 2,
      gap: 8,
    },
    accountText: {
      fontSize: 16,
      color: colors.text.default,
      textAlignVertical: 'center',
      includeFontPadding: false,
      fontWeight: '400',
    },
    addressText: {
      fontSize: 16,
      color: colors.primary.default,
      textAlignVertical: 'center',
      includeFontPadding: false,
      fontWeight: '600',
    },
  });

const RewardsTerms: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const address = useSelector(selectSelectedInternalAccountAddress);
  const { login, isLoading } = useRewardsAuth({
    onLoginSuccess: () => {
      navigation.navigate(Routes.REWARDS_DASHBOARD);
    },
  });

  const handleAccept = useCallback(async () => {
    if (!address) return;

    try {
      // Proceed with login - onLoginSuccess callback will handle navigation
      await login();
    } catch (error) {
      console.error('Error accepting terms:', error);
    }
  }, [address, login]);

  const handleDecline = useCallback(() => {
    // Just navigate back without doing anything
    navigation.goBack();
  }, [navigation]);

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.headerContainer}>
        <MorphText variant={TextVariant.HeadingMD} style={styles.title}>
          Sign up for Rewards
        </MorphText>
        <Text style={styles.termsText}>
          MetaMask wants permission to register you for our rewards product.
        </Text>
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.accountText}>Account</Text>
        <View style={styles.addressBadge}>
          <Identicon diameter={20} address={address} />
          <Text style={styles.addressText}>
            {address ? renderShortAddress(address) : ''}
          </Text>
        </View>
      </View>
      <ScrollView style={styles.termsContainer}>
        <Text style={styles.sectionTitle}>Terms of Service</Text>
        <Text style={styles.termsText}>
          Welcome to MetaMask Rewards! By using our service, you agree to these
          terms and conditions. Please read them carefully.
        </Text>

        <Text style={styles.sectionTitle}>Eligibility</Text>
        <Text style={styles.termsText}>
          You must be at least 18 years old and legally able to enter into
          contracts in your jurisdiction to use this service.
        </Text>

        <Text style={styles.sectionTitle}>Rewards Program</Text>
        <Text style={styles.termsText}>
          Our rewards program allows you to earn rewards based on your activity.
          Rewards are subject to availability and program terms.
        </Text>

        <Text style={styles.sectionTitle}>User Responsibilities</Text>
        <Text style={styles.termsText}>
          You are responsible for maintaining the security of your account and
          for all activities that occur under your account.
        </Text>

        <Text style={styles.sectionTitle}>Limitation of Liability</Text>
        <Text style={styles.termsText}>
          Our service is provided &quot;as is&quot; without warranties of any
          kind. We shall not be liable for any indirect, incidental, or
          consequential damages.
        </Text>

        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.termsText}>
          Your privacy is important to us. Please review our Privacy Policy to
          understand how we collect, use, and protect your information.
        </Text>

        <Text style={styles.termsText}>
          By clicking &quot;Accept&quot;, you acknowledge that you have read,
          understood, and agree to be bound by these terms and conditions.
        </Text>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <Button
          variant={ButtonVariants.Primary}
          label="Accept and Continue"
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          onPress={handleAccept}
          loading={isLoading}
        />
        <Button
          variant={ButtonVariants.Secondary}
          label="Decline"
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
          onPress={handleDecline}
        />
      </View>
    </SafeAreaView>
  );
};

export default RewardsTerms;
