import React, { useCallback, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  IconName,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import { useTheme } from '../../../../../util/theme';
import { MoneyEmailVerificationViewTestIds } from './MoneyEmailVerificationView.testIds';
import MoneySecuritySetupTitle from '../../components/MoneySecuritySetupTitle';
import type { MoneyNavigationParamList } from '../../types/navigation';

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    height: 56,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  centeredText: {
    textAlign: 'center',
  },
  emailField: { marginTop: 20 },
});

const MoneyEmailVerificationView = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const route =
    useRoute<RouteProp<MoneyNavigationParamList, 'MoneyEmailVerification'>>();
  const insets = useSafeAreaInsets();
  const { themeAppearance } = useTheme();
  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setIsEmailValid(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()));
  }, []);

  const handleContinue = useCallback(() => {
    if (!isEmailValid) {
      return;
    }

    const normalizedEmail = email.trim();
    navigation.navigate(Routes.MONEY.EMAIL_CODE_VERIFICATION, {
      email: normalizedEmail,
      returnToSecurity: route.params?.returnToSecurity,
    });
  }, [email, isEmailValid, navigation, route.params?.returnToSecurity]);

  return (
    <Box
      style={[styles.safeArea, { paddingTop: insets.top }]}
      twClassName="bg-default"
      testID={MoneyEmailVerificationViewTestIds.CONTAINER}
    >
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Box style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => navigation.goBack()}
            accessibilityLabel={strings('money.email_verification.back')}
            testID={MoneyEmailVerificationViewTestIds.BACK_BUTTON}
          />
        </Box>

        <Box style={styles.content}>
          <MoneySecuritySetupTitle>
            {strings('money.email_verification.title')}
          </MoneySecuritySetupTitle>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            twClassName="mt-2"
          >
            {strings('money.email_verification.description')}
          </Text>

          <Box style={styles.emailField}>
            <TextField
              value={email}
              onChangeText={handleEmailChange}
              placeholder={strings('money.email_verification.placeholder')}
              autoFocus
              inputProps={{
                keyboardType: 'email-address',
                keyboardAppearance: themeAppearance,
                textContentType: 'emailAddress',
                autoComplete: 'email',
                autoCapitalize: 'none',
                autoCorrect: false,
                spellCheck: false,
                returnKeyType: 'done',
                onSubmitEditing: handleContinue,
                testID: MoneyEmailVerificationViewTestIds.EMAIL_INPUT,
                accessibilityLabel: strings(
                  'money.email_verification.placeholder',
                ),
              }}
            />
          </Box>
        </Box>

        <Box
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          <Text
            variant={TextVariant.BodySm}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
            style={styles.centeredText}
            twClassName="px-2 mb-5"
          >
            {strings('money.email_verification.disclaimer')}
          </Text>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!isEmailValid}
            onPress={handleContinue}
            testID={MoneyEmailVerificationViewTestIds.CONTINUE_BUTTON}
          >
            {strings('money.email_verification.continue')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </Box>
  );
};

export default MoneyEmailVerificationView;
