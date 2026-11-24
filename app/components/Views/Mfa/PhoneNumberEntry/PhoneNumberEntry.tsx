import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Pressable, type ListRenderItem } from 'react-native';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  HelpText,
  HelpTextSeverity,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItemSelect,
  Text,
  TextColor,
  TextField,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import StepLayout from '../MfaFlowHost/steps/StepLayout';
import CountrySheet from './CountrySheet';
import {
  DEFAULT_PHONE_NUMBER_ENTRY_TEST_ID_PREFIX,
  getPhoneNumberEntryTestIds,
} from './PhoneNumberEntry.testIds';
import {
  DEFAULT_PHONE_COUNTRY_ISO,
  PHONE_COUNTRIES,
  formatNational,
  getCountryFlag,
  getCountryName,
  getInitialPhone,
  isValidNational,
  parsePhoneInput,
  toPhoneNumberValue,
  type PhoneCountry,
  type PhoneNumberValue,
} from './phone';

export interface PhoneNumberEntryProps {
  /** The screen's title. */
  title: string;
  /** The line under the title. */
  description?: string;
  /** The label of the button that submits the number. */
  ctaLabel: string;
  /**
   * A small note above the button, e.g. what the number is used for or who
   * sends the code. A string renders as centred secondary text.
   */
  disclaimer?: ReactNode;
  /** ISO 3166-1 code of the country to start with. Defaults to `US`. */
  defaultCountry?: string;
  /** A number to start with: E.164, or national digits of `defaultCountry`. */
  initialValue?: string;
  /**
   * Called with a valid number when the user submits. The caller sends the
   * code and reports a failure through `error`; a rejection is ignored here.
   */
  onSubmit: (phone: PhoneNumberValue) => Promise<void>;
  /** Shows the submit button as loading and ignores further submits. */
  isSubmitting?: boolean;
  /** A message under the input, from the caller. A string renders as an error. */
  error?: ReactNode;
  /** Prefix of the test ids; see `getPhoneNumberEntryTestIds`. */
  testIdPrefix?: string;
}

const noop = () => undefined;

// Digits for the example number shown as the placeholder: (555) 123-4567.
const EXAMPLE_DIGITS = '5551234567890';

/**
 * The "Verify your phone number" screen: a phone input with a country code
 * picker, formatting as the user types, validation and E.164 output. It knows
 * nothing of the MFA engine; everything flow specific comes in through props.
 * Navigation is the host's: it has no back or cancel button of its own.
 */
const PhoneNumberEntry = ({
  title,
  description,
  ctaLabel,
  disclaimer,
  defaultCountry,
  initialValue,
  onSubmit,
  isSubmitting = false,
  error,
  testIdPrefix = DEFAULT_PHONE_NUMBER_ENTRY_TEST_ID_PREFIX,
}: PhoneNumberEntryProps) => {
  const ids = getPhoneNumberEntryTestIds(testIdPrefix);
  const [phone, setPhone] = useState(() =>
    getInitialPhone(initialValue, defaultCountry),
  );
  const [isTouched, setIsTouched] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const isSending = useRef(false);

  const { country, digits } = phone;
  const isValid = isValidNational(digits, country);
  const showInvalid = isTouched && digits.length > 0 && !isValid;

  const submit = async () => {
    if (!isValid) {
      setIsTouched(true);
      return;
    }
    if (isSubmitting || isSending.current) {
      return;
    }
    isSending.current = true;
    try {
      await onSubmit(toPhoneNumberValue(digits, country));
    } catch {
      // The caller reports a failure through `error`.
    } finally {
      isSending.current = false;
    }
  };

  const selectCountry = (next: PhoneCountry) => {
    setPhone({
      country: next,
      digits: parsePhoneInput(digits, next).digits,
    });
    setIsTouched(false);
  };

  // The invalid number takes the place of the caller's error: one message at
  // a time.
  let message: ReactNode = error;
  if (showInvalid) {
    message = (
      <HelpText
        severity={HelpTextSeverity.Danger}
        fontWeight={FontWeight.Medium}
        accessibilityRole="alert"
        testID={ids.INVALID}
      >
        {strings('mfa.phone_entry.invalid')}
      </HelpText>
    );
  } else if (typeof error === 'string') {
    message = (
      <HelpText
        severity={HelpTextSeverity.Danger}
        accessibilityRole="alert"
        testID={ids.ERROR}
      >
        {error}
      </HelpText>
    );
  }

  return (
    <>
      <StepLayout
        title={title}
        description={description}
        footer={
          <>
            {disclaimer ? (
              <Box twClassName="pb-2" testID={ids.DISCLAIMER}>
                {typeof disclaimer === 'string' ? (
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.TextAlternative}
                    twClassName="text-center"
                  >
                    {disclaimer}
                  </Text>
                ) : (
                  disclaimer
                )}
              </Box>
            ) : null}
            <Button
              variant={ButtonVariant.Primary}
              size={ButtonSize.Lg}
              isFullWidth
              isLoading={isSubmitting}
              isDisabled={!isValid}
              onPress={() => {
                submit().catch(noop);
              }}
              testID={ids.SUBMIT_BUTTON}
            >
              {ctaLabel}
            </Button>
          </>
        }
      >
        <Box twClassName="gap-2">
          <TextField
            value={formatNational(digits, country)}
            startAccessory={
              <Pressable
                onPress={() => setIsPickerOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={`${strings(
                  'mfa.phone_entry.country_label',
                )}: ${getCountryName(country.iso)} +${country.callingCode}`}
                testID={ids.COUNTRY_BUTTON}
              >
                <Box twClassName="flex-row items-center gap-2">
                  <Text
                    variant={TextVariant.BodyMd}
                    fontWeight={FontWeight.Medium}
                  >
                    {getCountryFlag(country.iso)} +{country.callingCode}
                  </Text>
                  <Icon
                    name={IconName.ArrowDown}
                    size={IconSize.Xs}
                    color={IconColor.IconAlternative}
                  />
                  <Box twClassName="h-3.5 w-px bg-border-muted" />
                </Box>
              </Pressable>
            }
            onChangeText={(text) => {
              // Typing and pasting both land here; a pasted `+44…` number
              // also switches the country.
              setPhone(parsePhoneInput(text, country));
              setIsTouched(false);
            }}
            placeholder={formatNational(
              EXAMPLE_DIGITS.slice(0, country.minDigits),
              country,
            )}
            isError={showInvalid || error !== undefined}
            autoFocus
            onBlur={() => setIsTouched(true)}
            inputProps={{
              keyboardType: 'phone-pad',
              autoCorrect: false,
              autoComplete: 'tel',
              textContentType: 'telephoneNumber',
              returnKeyType: 'done',
              onSubmitEditing: () => {
                submit().catch(noop);
              },
              testID: ids.INPUT,
            }}
          />
          {message}
        </Box>
      </StepLayout>
      {isPickerOpen ? (
        <CountrySheet
          selected={country}
          onClose={() => setIsPickerOpen(false)}
          onSelect={selectCountry}
          testIdPrefix={testIdPrefix}
        />
      ) : null}
    </>
  );
};

export default PhoneNumberEntry;
