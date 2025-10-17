import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';

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
import FoxImage from '../../../../../images/branding/fox.png';
import { useTheme } from '../../../../../util/theme';
import createStyles from './CardAuthentication.styles';
import { SafeAreaView } from 'react-native-safe-area-context';
import useCardProviderAuthentication from '../../hooks/useCardProviderAuthentication';
import { CardAuthenticationSelectors } from '../../../../../../e2e/selectors/Card/CardAuthentication.selectors';
import Routes from '../../../../../constants/navigation/Routes';
import { CardLocation } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import Logger from '../../../../../util/Logger';

const CardAuthentication = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<CardLocation>('international');
  const theme = useTheme();
  const { login, error, clearError } = useCardProviderAuthentication();

  const styles = createStyles(theme);

  const handleEmailChange = (newEmail: string) => {
    setEmail(newEmail);
    if (error) {
      clearError();
    }
  };

  const handlePasswordChange = (newPassword: string) => {
    setPassword(newPassword);
    if (error) {
      clearError();
    }
  };

  const performLogin = useCallback(async () => {
    try {
      setLoading(true);
      await login({
        location,
        email,
        password,
      });

      navigation.reset({
        index: 0,
        routes: [{ name: Routes.CARD.HOME }],
      });
    } catch (err) {
      Logger.log('CardAuthentication::Login failed', err);
    } finally {
      setLoading(false);
    }
  }, [email, location, login, password, navigation]);

  const isDisabled = useMemo(
    () => !!error || email.length === 0 || password.length === 0,
    [error, email, password],
  );

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
          <Box style={styles.container}>
            <Box style={styles.imageWrapper}>
              <Image
                source={FoxImage}
                style={styles.image}
                resizeMode="contain"
                testID={CardAuthenticationSelectors.FOX_IMAGE}
              />
            </Box>
            <Text
              variant={TextVariant.HeadingMd}
              testID={CardAuthenticationSelectors.WELCOME_TO_CARD_TITLE_TEXT}
              style={styles.title}
            >
              {strings('card.card_authentication.title')}
            </Text>
            <Box style={styles.locationButtonsContainer}>
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
                  style={[
                    styles.locationButtonText,
                    {
                      color:
                        location === 'international'
                          ? theme.colors.primary.default
                          : theme.colors.text.alternative,
                    },
                  ]}
                  variant={TextVariant.BodySm}
                >
                  {strings('card.card_authentication.location_button_text')}
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
                  style={[
                    styles.locationButtonText,
                    {
                      color:
                        location === 'us'
                          ? theme.colors.primary.default
                          : theme.colors.text.alternative,
                    },
                  ]}
                  variant={TextVariant.BodySm}
                >
                  {strings('card.card_authentication.location_button_text_us')}
                </Text>
              </TouchableOpacity>
            </Box>
            <Box style={styles.textFieldsContainer}>
              <Box>
                <Label style={styles.label}>
                  {strings('card.card_authentication.email_label')}
                </Label>
                <TextField
                  autoCapitalize={'none'}
                  onChangeText={handleEmailChange}
                  placeholder={strings(
                    'card.card_authentication.email_placeholder',
                  )}
                  numberOfLines={1}
                  size={TextFieldSize.Lg}
                  value={email}
                  returnKeyType={'next'}
                  keyboardType="email-address"
                  maxLength={255}
                  accessibilityLabel={strings(
                    'card.card_authentication.email_label',
                  )}
                />
              </Box>
              <Box>
                <Label style={styles.label}>
                  {strings('card.card_authentication.password_label')}
                </Label>
                <TextField
                  autoCapitalize={'none'}
                  onChangeText={handlePasswordChange}
                  placeholder={strings(
                    'card.card_authentication.password_placeholder',
                  )}
                  numberOfLines={1}
                  size={TextFieldSize.Lg}
                  value={password}
                  maxLength={255}
                  returnKeyType={'done'}
                  onSubmitEditing={performLogin}
                  secureTextEntry
                  accessibilityLabel={strings(
                    'card.card_authentication.password_label',
                  )}
                />
              </Box>
            </Box>
            {error && (
              <Box style={styles.errorBox}>
                <Text
                  variant={TextVariant.BodySm}
                  style={{ color: theme.colors.error.default }}
                >
                  {error}
                </Text>
              </Box>
            )}
            <Box>
              <Button
                variant={ButtonVariants.Primary}
                label={strings('card.card_authentication.login_button')}
                size={ButtonSize.Lg}
                testID={CardAuthenticationSelectors.VERIFY_ACCOUNT_BUTTON}
                onPress={performLogin}
                loading={loading}
                style={[styles.button, isDisabled && styles.buttonDisabled]}
                width={ButtonWidthTypes.Full}
                disabled={isDisabled}
              />
            </Box>
          </Box>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
};

export default CardAuthentication;
