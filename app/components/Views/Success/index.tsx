import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../../component-library/components/Buttons/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button/Button.types';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';

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

const OnboardingSuccess = () => {
  const navigation = useNavigation();

  const startApp = () => {
    // FRANK: fix this
    navigation.navigate(Routes.ONBOARDING.HOME_NAV, {
      screen: Routes.WALLET_VIEW,
    });
  };
  return (
    <View style={styles.root}>
      <View style={styles.topWrapper}>
        <Text style={styles.emoji}>🎉</Text>
        <Text style={styles.title}>{strings('onboarding_success.title')}</Text>
        <View style={styles.descriptionWrapper}>
          <Text style={styles.description}>
            {strings('onboarding_success.description')}
          </Text>
        </View>
      </View>
      <View style={styles.buttonWrapper}>
        <Button
          label={strings('onboarding_success.default_settings')}
          variant={ButtonVariants.Secondary}
          style={styles.button}
          onPress={() => navigation.navigate('DefaultSettings')}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
        <Button
          label={strings('onboarding_success.done')}
          variant={ButtonVariants.Primary}
          onPress={startApp}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </View>
  );
};

export default OnboardingSuccess;
