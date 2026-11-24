// PROTOTYPE-DO-NOT-MERGE
import React, { useCallback, useState } from 'react';
import { Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { Country } from '@metamask/ramps-controller';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  HelpText,
  HelpTextSeverity,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import StepLayout from '../../../../Views/Mfa/MfaFlowHost/steps/StepLayout';
import { formatNumberToTemplate } from '../../../Ramp/utils/formatNumberToTemplate';
import { GEORGE_COPY, PROTOTYPE_COPY } from './prototypeConstants';
import {
  PROTOTYPE_DEFAULT_PHONE_COUNTRY,
  PROTOTYPE_PHONE_COUNTRIES,
  isPrototypePhoneComplete,
} from './prototypePhoneCountries';
import {
  KalshiPrototypeRoutes,
  type KalshiPrototypeParamList,
} from './prototypeRoutes';
import KalshiWordmark from './KalshiWordmark';
import { KalshiPrototypePhoneEntrySelectorsIDs } from './KalshiPrototypePhoneEntry.testIds';

interface KalshiPrototypePhoneEntryProps {
  /** Sends the code to the full number (dial code + digits). */
  onSend: (phoneNumber: string) => void | Promise<void>;
  /** Leaves the screen. */
  onBack: () => void;
}

// The shared MFA layout sends actions; this screen has none to send.
const noAction = () => undefined;

/**
 * The Kalshi phone step, laid out like MetaMask's MFA entry screens (the
 * shared step layout under the Kalshi wordmark). The field leads with the
 * country's flag and dial code; tapping them opens Ramp's phone country
 * sheet, and the number is formatted to the country's template with Ramp's
 * formatter as it is typed.
 *
 * @param props - The send and back handlers.
 * @returns The screen.
 */
const KalshiPrototypePhoneEntry = ({
  onSend,
  onBack,
}: KalshiPrototypePhoneEntryProps) => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NativeStackNavigationProp<KalshiPrototypeParamList>>();
  const [country, setCountry] = useState<Country>(
    PROTOTYPE_DEFAULT_PHONE_COUNTRY,
  );
  const [digits, setDigits] = useState('');
  const [showError, setShowError] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const isComplete = isPrototypePhoneComplete(digits, country);
  const maxDigits = (country.phone.template.match(/X/g) ?? []).length;

  const handleChangeText = useCallback(
    (text: string) => {
      setDigits(text.replace(/\D/g, '').slice(0, maxDigits));
      setShowError(false);
    },
    [maxDigits],
  );

  const handleCountryPress = useCallback(() => {
    navigation.navigate(KalshiPrototypeRoutes.PHONE_COUNTRY, {
      countries: PROTOTYPE_PHONE_COUNTRIES,
      selectedCountry: country,
      onCountrySelect: (next: Country) => {
        setCountry(next);
        setShowError(false);
      },
    });
  }, [country, navigation]);

  const handleSend = async () => {
    if (!isComplete) {
      setShowError(true);
      return;
    }
    setIsSending(true);
    try {
      await onSend(`${country.phone.prefix}${digits}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Box
      style={tw.style('flex-1 bg-default')}
      testID={KalshiPrototypePhoneEntrySelectorsIDs.CONTAINER}
    >
      <HeaderStandard
        title={<KalshiWordmark />}
        onBack={onBack}
        includesTopInset
      />
      <StepLayout
        onAction={noAction}
        title={PROTOTYPE_COPY.phoneEntry.title}
        description={PROTOTYPE_COPY.phoneEntry.body}
        footer={
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={digits.length === 0}
            isLoading={isSending}
            onPress={handleSend}
            testID={KalshiPrototypePhoneEntrySelectorsIDs.SEND_BUTTON}
          >
            {GEORGE_COPY.phone.sendCode}
          </Button>
        }
      >
        <Box twClassName="gap-2">
          <TextField
            testID={KalshiPrototypePhoneEntrySelectorsIDs.INPUT}
            value={formatNumberToTemplate(digits, country.phone.template)}
            onChangeText={handleChangeText}
            onBlur={() => setShowError(digits.length > 0 && !isComplete)}
            placeholder={country.phone.placeholder}
            isError={showError}
            autoFocus
            startAccessory={
              <Pressable
                onPress={handleCountryPress}
                accessibilityRole="button"
                accessibilityLabel={`${country.name} ${country.phone.prefix}`}
                testID={KalshiPrototypePhoneEntrySelectorsIDs.COUNTRY_BUTTON}
                style={tw.style('flex-row items-center gap-1 pr-3 mr-1')}
              >
                <Text variant={TextVariant.BodyMd}>{country.flag}</Text>
                <Text variant={TextVariant.BodyMd}>{country.phone.prefix}</Text>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Sm}
                  color={IconColor.IconAlternative}
                />
                <Box twClassName="ml-2 h-5 w-px bg-border-muted" />
              </Pressable>
            }
            inputProps={{
              keyboardType: 'phone-pad',
              textContentType: 'telephoneNumber',
              autoComplete: 'tel',
            }}
          />
          {showError ? (
            <HelpText
              severity={HelpTextSeverity.Danger}
              accessibilityRole="alert"
              testID={KalshiPrototypePhoneEntrySelectorsIDs.ERROR}
            >
              {PROTOTYPE_COPY.phoneEntry.invalid}
            </HelpText>
          ) : null}
        </Box>
      </StepLayout>
    </Box>
  );
};

export default KalshiPrototypePhoneEntry;
