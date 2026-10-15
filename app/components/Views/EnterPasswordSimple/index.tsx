import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import type {
  AppNavigationProp,
  RootStackParamList,
} from '../../../core/NavigationService/types';
import { strings } from '../../../../locales/i18n';
import { passwordRequirementsMet } from '../../../util/password';
import { useTheme } from '../../../util/theme';

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
    paddingTop: 8,
  },
  description: {
    marginTop: 12,
  },
  passwordField: {
    marginTop: 24,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
});

interface EnterPasswordSimpleProps {
  navigation: AppNavigationProp;
  route: RouteProp<RootStackParamList, 'EnterPasswordSimple'>;
}

const EnterPasswordSimple = ({
  navigation,
  route,
}: EnterPasswordSimpleProps) => {
  const { themeAppearance } = useTheme();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const completedRef = useRef(false);
  const isPasswordValid = passwordRequirementsMet(password);

  useEffect(
    () => () => {
      if (!completedRef.current) {
        route.params?.onCancel?.();
      }
    },
    [route.params],
  );

  const handleConfirm = useCallback(async () => {
    if (isLoading) {
      return;
    }
    if (!isPasswordValid) {
      Alert.alert(
        strings('enter_password.error'),
        strings('choose_password.password_length_error'),
      );
      return;
    }

    setIsLoading(true);
    try {
      await route.params?.onPasswordSet(password);
      completedRef.current = true;
      setIsLoading(false);
      navigation.goBack();
    } catch {
      setIsLoading(false);
    }
  }, [isLoading, isPasswordValid, navigation, password, route.params]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.safeArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Box style={styles.header}>
          <ButtonIcon
            iconName={IconName.ArrowLeft}
            size={ButtonIconSize.Md}
            onPress={() => navigation.goBack()}
            accessibilityLabel={strings('navigation.back')}
            testID="enter-password-simple-back-button"
          />
        </Box>

        <Box style={styles.content}>
          <Text variant={TextVariant.HeadingLg} fontWeight={FontWeight.Bold}>
            {strings('enter_password.title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextAlternative}
            style={styles.description}
          >
            {strings('enter_password.desc')}
          </Text>
          <Box style={styles.passwordField}>
            <TextField
              value={password}
              onChangeText={setPassword}
              placeholder={strings('enter_password.password')}
              autoFocus
              inputProps={{
                secureTextEntry: true,
                keyboardAppearance: themeAppearance,
                textContentType: 'password',
                autoComplete: 'current-password',
                returnKeyType: 'done',
                onSubmitEditing: handleConfirm,
                testID: 'enter-password-simple-input',
                accessibilityLabel: strings('enter_password.password'),
              }}
            />
          </Box>
        </Box>

        <Box style={styles.footer}>
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!isPasswordValid}
            isLoading={isLoading}
            onPress={handleConfirm}
            testID="enter-password-simple-confirm-button"
          >
            {strings('enter_password.confirm_button')}
          </Button>
        </Box>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EnterPasswordSimple;
