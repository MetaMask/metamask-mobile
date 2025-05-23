import React, { useCallback, useRef, useState, useEffect } from 'react';
import { TextInput, View } from 'react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './EmailAuth.styles';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import Label from '../../../../../component-library/components/Form/Label';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Row from '../../..//Ramp/components/Row';
import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';

enum EmailAuthView {
  ENTER_EMAIL = 'ENTER_EMAIL',
  ENTER_CODE = 'ENTER_CODE',
}

export const createIdVerifyNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ID_VERIFY,
);

// Mock async SDK functions
// TODO: Replace with actual SDK functions to submit email and code to Transak
const submitEmail = (email: string): Promise<void> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (email.includes('@')) {
        resolve();
      } else {
        reject(new Error('Invalid email address'));
      }
    }, 2000);
  });

const submitCode = (code: string): Promise<void> =>
  new Promise((resolve, reject) => {
    setTimeout(() => {
      if (code.length === 6) {
        resolve();
      } else {
        reject(new Error('Invalid code'));
      }
    }, 2000);
  });

const EnterEmail = ({
  value,
  setValue,
  onSubmit,
}: {
  value: string;
  setValue: (value: string) => void;
  onSubmit: () => void;
}) => {
  const {
    styles,
    theme: { colors, themeAppearance },
  } = useStyles(styleSheet, {});
  const emailInputRef = useRef<TextInput>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await submitEmail(value);
      onSubmit();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Row style={styles.subtitle}>
            <Text>{strings('deposit.email_auth.email.description')}</Text>
          </Row>

          <View style={styles.field}>
            <Label variant={TextVariant.HeadingSMRegular} style={styles.label}>
              {strings('deposit.email_auth.email.input_label')}
            </Label>
            <TextField
              size={TextFieldSize.Lg}
              placeholder={strings(
                'deposit.email_auth.email.input_placeholder',
              )}
              placeholderTextColor={colors.text.muted}
              returnKeyType={'done'}
              autoCapitalize="none"
              ref={emailInputRef}
              onChangeText={setValue}
              value={value}
              keyboardAppearance={themeAppearance}
            />
            {error && (
              <Text style={{ color: colors.error.default }}>{error}</Text>
            )}
          </View>
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={handleSubmit}
            accessibilityRole="button"
            accessible
            disabled={loading}
          >
            {loading
              ? strings('deposit.email_auth.email.loading')
              : strings('deposit.email_auth.email.submit_button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

const CELL_COUNT = 6;

const EnterCode = ({
  onSubmit,
  value,
  setValue,
}: {
  value: string;
  setValue: (code: string) => void;
  onSubmit: () => void;
}) => {
  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT }) || null;
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [ref]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await submitCode(value);
      onSubmit();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Text>Enter the 6 digit code that we sent to your email</Text>
          <CodeField
            ref={ref}
            {...props}
            value={value}
            onChangeText={setValue}
            cellCount={CELL_COUNT}
            rootStyle={styles.codeFieldRoot}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            renderCell={({ index, symbol, isFocused }) => (
              <View
                onLayout={getCellOnLayoutHandler(index)}
                key={index}
                style={[styles.cellRoot, isFocused && styles.focusCell]}
              >
                <Text style={styles.cellText}>
                  {symbol || (isFocused ? <Cursor /> : null)}
                </Text>
              </View>
            )}
          />

          {error && (
            <Text style={{ color: colors.error.default }}>{error}</Text>
          )}
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={handleSubmit}
            accessibilityRole="button"
            accessible
          >
            {loading
              ? strings('deposit.email_auth.code.loading')
              : strings('deposit.email_auth.code.submit_button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

const EmailAuth = () => {
  const navigation = useNavigation();

  const [view, setView] = useState<EmailAuthView>(EmailAuthView.ENTER_EMAIL);

  const handleOnPressSendEmail = useCallback(() => {
    setView(EmailAuthView.ENTER_CODE);
  }, []);

  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');

  if (view === EmailAuthView.ENTER_EMAIL) {
    return (
      <EnterEmail
        value={email}
        setValue={setEmail}
        onSubmit={handleOnPressSendEmail}
      />
    );
  }

  if (view === EmailAuthView.ENTER_CODE) {
    return (
      <EnterCode
        value={code}
        setValue={setCode}
        onSubmit={() => navigation.navigate(...createIdVerifyNavDetails())}
      />
    );
  }

  return null;
};

export default EmailAuth;
