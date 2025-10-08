import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';

import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';

import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';

import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import FoxImage from '../../../../../images/branding/fox.png';
import { useTheme } from '../../../../../util/theme';
import createStyles from './CardAuthentication.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import useCardProviderAuthentication from '../../hooks/useCardProviderAuthentication';
import Logger from '../../../../../util/Logger';
import { CardAuthenticationSelectors } from '../../../../../../e2e/selectors/Card/CardAuthentication.selectors';
import { NavigationActions } from '@react-navigation/compat';

const CardAuthentication = () => {
  const { dispatch } = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState<'us' | 'international'>(
    'international',
  );
  const theme = useTheme();
  const { login, loading } = useCardProviderAuthentication();

  const styles = createStyles(theme);

  const performLogin = async () => {
    try {
      await login({
        location,
        email,
        password,
      });
      dispatch(
        NavigationActions.navigate({
          routeName: 'CardHome',
        }),
      );
    } catch (error) {
      Logger.log('BaanxOAuth login: error', error);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardAvoidingView}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={styles.safeAreaView} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.scrollViewContentContainer}
          showsVerticalScrollIndicator={false}
          alwaysBounceVertical={false}
        >
          <View style={styles.container}>
            <View style={styles.imageWrapper}>
              <Image
                source={FoxImage}
                style={styles.image}
                resizeMode="contain"
                testID={CardAuthenticationSelectors.FOX_IMAGE}
              />
            </View>
            <Text
              variant={TextVariant.HeadingMD}
              testID={CardAuthenticationSelectors.WELCOME_TO_CARD_TITLE_TEXT}
              style={styles.title}
            >
              {'Log in to your Card account'}
            </Text>
            <View style={styles.locationButtonsContainer}>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  location === 'international' && styles.locationButtonSelected,
                ]}
                onPress={() => setLocation('international')}
              >
                <Icon
                  name={IconName.Global}
                  size={IconSize.Lg}
                  color={
                    location === 'international'
                      ? theme.colors.primary.default
                      : theme.colors.text.alternative
                  }
                />
                <Text
                  style={styles.locationButtonText}
                  variant={TextVariant.BodySM}
                  color={
                    location === 'international'
                      ? theme.colors.primary.default
                      : theme.colors.text.alternative
                  }
                >
                  International
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationButton,
                  location === 'us' && styles.locationButtonSelected,
                ]}
                onPress={() => setLocation('us')}
              >
                <Text style={styles.usFlag}>🇺🇸</Text>
                <Text
                  style={styles.locationButtonText}
                  variant={TextVariant.BodySM}
                  color={
                    location === 'us'
                      ? theme.colors.primary.default
                      : theme.colors.text.alternative
                  }
                >
                  US account
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.textFieldsContainer}>
              <View>
                <Label style={styles.label}>{'Email'}</Label>
                <TextField
                  autoCapitalize={'none'}
                  onChangeText={setEmail}
                  placeholder={'Enter your email'}
                  numberOfLines={1}
                  size={TextFieldSize.Lg}
                  value={email}
                  returnKeyType={'next'}
                  keyboardType="email-address"
                />
              </View>
              <View>
                <Label style={styles.label}>{'Password'}</Label>
                <TextField
                  autoCapitalize={'none'}
                  onChangeText={setPassword}
                  placeholder={'Enter your password'}
                  numberOfLines={1}
                  size={TextFieldSize.Lg}
                  value={password}
                  returnKeyType={'done'}
                  onSubmitEditing={performLogin}
                  secureTextEntry
                />
              </View>
            </View>
            <View>
              <Button
                variant={ButtonVariants.Primary}
                label={'Log in'}
                size={ButtonSize.Lg}
                testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
                onPress={performLogin}
                loading={loading}
                style={styles.button}
                width={ButtonWidthTypes.Full}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default CardAuthentication;
