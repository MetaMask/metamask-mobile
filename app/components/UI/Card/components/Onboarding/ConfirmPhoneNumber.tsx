import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TextInput, StyleSheet } from 'react-native';
import { Box, Text, TextVariant } from '@metamask/design-system-react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Label from '../../../../../component-library/components/Form/Label';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import OnboardingStep from './OnboardingStep';
import { useParams } from '../../../../../util/navigation/navUtils';
import {
  CodeField,
  Cursor,
  useClearByFocusCell,
} from 'react-native-confirmation-code-field';
import { useStyles } from '../../../../../component-library/hooks';
import { Theme } from '../../../../../util/theme/models';

const CELL_COUNT = 6;

// Styles for the OTP CodeField
const createStyles = (params: { theme: Theme }) => {
  const { theme } = params;

  return StyleSheet.create({
    codeFieldRoot: {
      marginTop: 8,
      gap: 8,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    cellRoot: {
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.default,
      borderWidth: 1,
      borderColor: theme.colors.border.default,
      borderRadius: 8,
    },
    focusCell: {
      borderColor: theme.colors.primary.default,
      borderWidth: 2,
    },
  });
};

const ConfirmPhoneNumber = () => {
  const navigation = useNavigation();
  const { styles } = useStyles(createStyles, {});
  const inputRef = useRef<TextInput>(null);

  const [confirmCode, setConfirmCode] = useState('');
  const [latestValueSubmitted, setLatestValueSubmitted] = useState<
    string | null
  >(null);

  const { phoneNumber } = useParams<{ phoneNumber: string }>();

  const handleContinue = useCallback(() => {
    navigation.navigate(Routes.CARD.ONBOARDING.VALIDATING_KYC);
  }, [navigation]);

  const handleValueChange = useCallback((text: string) => {
    setConfirmCode(text);
    setLatestValueSubmitted(null);
  }, []);

  // Auto-submit when all digits are entered
  useEffect(() => {
    if (
      confirmCode.length === CELL_COUNT &&
      latestValueSubmitted !== confirmCode
    ) {
      setLatestValueSubmitted(confirmCode);
      handleContinue();
    }
  }, [confirmCode, handleContinue, latestValueSubmitted]);

  // Focus management
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value: confirmCode,
    setValue: handleValueChange,
  });

  const renderFormFields = () => (
    <Box>
      <Label>
        {strings(
          'card.card_onboarding.confirm_phone_number.confirm_code_label',
        )}
      </Label>
      <CodeField
        ref={inputRef}
        {...props}
        value={confirmCode}
        onChangeText={handleValueChange}
        cellCount={CELL_COUNT}
        rootStyle={styles.codeFieldRoot}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        renderCell={({ index, symbol, isFocused }) => (
          <View
            onLayout={getCellOnLayoutHandler(index)}
            key={index}
            style={[styles.cellRoot, isFocused && styles.focusCell]}
          >
            <Text
              variant={TextVariant.BodyLg}
              twClassName="text-text-default font-bold text-center"
            >
              {symbol || (isFocused ? <Cursor /> : null)}
            </Text>
          </View>
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
      isDisabled={!confirmCode || confirmCode.length < CELL_COUNT}
    />
  );

  return (
    <OnboardingStep
      title={strings('card.card_onboarding.confirm_phone_number.title')}
      description={strings(
        'card.card_onboarding.confirm_phone_number.description',
        { phoneNumber },
      )}
      formFields={renderFormFields()}
      actions={renderActions()}
    />
  );
};

export default ConfirmPhoneNumber;
