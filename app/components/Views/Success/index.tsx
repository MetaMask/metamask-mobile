import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../../component-library/components/Buttons/Button';
import {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button/Button.types';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../locales/i18n';
import Routes from '../../../../app/constants/navigation/Routes';
import { getTransparentOnboardingNavbarOptions } from '../../UI/Navbar';
import { useTheme } from '../../../util/theme';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  topWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonWrapper: {
    width: '85%',
    bottom: 50,
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
  backButton: {
    padding: 10,
  },
});

const OnboardingSuccess = ({ onDone }: { onDone: () => void }) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions(getTransparentOnboardingNavbarOptions(colors));
  }, [navigation, colors]);

  const goToDefaultSettings = () => {
    navigation.navigate(Routes.ONBOARDING.SUCCESS_FLOW, {
      screen: Routes.ONBOARDING.DEFAULT_SETTINGS,
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
          onPress={goToDefaultSettings}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
        <Button
          label={strings('onboarding_success.done')}
          variant={ButtonVariants.Primary}
          onPress={onDone}
          size={ButtonSize.Lg}
          width={ButtonWidthTypes.Full}
        />
      </View>
    </View>
  );
};

export default OnboardingSuccess;
