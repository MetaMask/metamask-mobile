import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../../component-library/components/Buttons/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button/Button.types';
import { useNavigation } from '@react-navigation/native';
// import { strings } from '../../../../locales/i18n';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topWrapper: {
    flex: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '80%',
    flex: 2,
  },
  emoji: {
    fontSize: 74,
    fontWeight: '400',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'left',
    marginTop: 14,
    lineHeight: 22,
    fontWeight: '400',
  },
  descriptionWrapper: {
    width: '90%',
  },
  button: {
    marginBottom: 16,
  },
});

const strings = (key: string) =>
  ({
    title: 'Your Wallet is ready',
    description:
      "Remember, if you lose your Secret Recovery Phrase, you lose access to your wallet. Learn how to keep this set of words safe so you can always access your funds.\n\nWe've turned on default settings to make MetaMask easier and safer to use, but you can change this at anytime.",
    defaultSettings: 'Default Settings',
    done: 'Done',
  }[key]);

const OnboardingSuccess = () => {
  const navigation = useNavigation();
    return (
      <View style={styles.root}>
      <View style={styles.topWrapper}>
          <Text style={styles.emoji}>🎉</Text>
          <Text style={styles.title}>{strings('title')}</Text>
          <View style={styles.descriptionWrapper}>
            <Text style={styles.description}>{strings('description')}</Text>
          </View>
        </View>
        <View style={styles.buttonWrapper}>
          <Button
            label={strings('defaultSettings')}
            variant={ButtonVariants.Secondary}
            style={styles.button}
            onPress={() => navigation.navigate('DefaultSettings')}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
          >
            {strings('account_backup_step_1B.cta_text')}
          </Button>
          <Button
            label={strings('done')}
            variant={ButtonVariants.Primary}
            onPress={() => console.log('DONE')}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
          >
            {strings('account_backup_step_1B.cta_text')}
          </Button>
        </View>
      </View>
    )};

export default OnboardingSuccess;
