import React, { useCallback, useState } from 'react';
import { TextInput } from 'react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './EmailAuth.styles';
import StyledButton from '../../../StyledButton';
// TODO: Should we be using the same ScreenLayout as Ramp? If so, should it be moved to a shared location?
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

enum EmailAuthView {
  ENTER_EMAIL = 'ENTER_EMAIL',
  ENTER_CODE = 'ENTER_CODE',
}

export const createIdVerifyNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ID_VERIFY,
);

const EnterEmail = ({ onSubmit }: { onSubmit: () => void }) => {
  const { styles } = useStyles(styleSheet, {});
  const [email, setEmail] = useState('');

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          <Text>We will send you a code to verify your email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={onSubmit}
            accessibilityRole="button"
            accessible
          >
            Send email
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

const EnterCode = ({ onSubmit }: { onSubmit: () => void }) => {
  const { styles } = useStyles(styleSheet, {});
  const [code, setCode] = useState('');

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          <Text>Enter the 6 digit code that we sent to your email</Text>
          <TextInput
            style={styles.input}
            placeholder="6 Digit Code"
            value={code}
            onChangeText={setCode}
          />
        </ScreenLayout.Content>
      </ScreenLayout.Body>

      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={onSubmit}
            accessibilityRole="button"
            accessible
          >
            Continue
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

  return view === EmailAuthView.ENTER_EMAIL ? (
    <EnterEmail onSubmit={handleOnPressSendEmail} />
  ) : view === EmailAuthView.ENTER_CODE ? (
    <EnterCode
      onSubmit={() => navigation.navigate(...createIdVerifyNavDetails())}
    />
  ) : null;
};

export default EmailAuth;
