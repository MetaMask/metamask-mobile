import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Box } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import TextField, {
  TextFieldSize,
} from '../../../../../component-library/components/Form/TextField';
import Label from '../../../../../component-library/components/Form/Label';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { useParams } from '../../../../../util/navigation/navUtils';

const ConfirmEmail = () => {
  const navigation = useNavigation();
  const [confirmCode, setConfirmCode] = useState('');
  const { email } = useParams<{ email: string }>();

  const handleContinue = () => {
    navigation.navigate(Routes.CARD.ONBOARDING.SET_PHONE_NUMBER);
  };

  const renderFormFields = () => (
    <Box>
      <Label>
        {strings('card.card_onboarding.confirm_email.confirm_code_label')}
      </Label>
      <TextField
        autoCapitalize={'none'}
        onChangeText={setConfirmCode}
        placeholder={strings(
          'card.card_onboarding.confirm_email.confirm_code_placeholder',
        )}
        numberOfLines={1}
        size={TextFieldSize.Lg}
        value={confirmCode}
        keyboardType="numeric"
        maxLength={255}
        accessibilityLabel={strings(
          'card.card_onboarding.confirm_email.confirm_code_label',
        )}
      />
    </Box>
  );

  const renderActions = () => (
    <Button
      variant={ButtonVariants.Primary}
      label={strings('card.card_onboarding.continue_button')}
      size={ButtonSize.Lg}
      onPress={handleContinue}
      width={ButtonWidthTypes.Full}
      isDisabled={!confirmCode}
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.confirm_email.title')}
      description={strings('card.card_onboarding.confirm_email.description', {
        email,
      })}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default ConfirmEmail;
