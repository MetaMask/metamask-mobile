import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Row from '../../../Aggregator/components/Row';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './BasicInfo.styles';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import DepositTextField from '../../components/DepositTextField';
import { useForm } from '../../hooks/useForm';
import DepositPhoneField from '../../components/DepositPhoneField';
import DepositProgressBar from '../../components/DepositProgressBar';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { createEnterAddressNavDetails } from '../EnterAddress/EnterAddress';
import { BuyQuote } from '@consensys/native-ramps-sdk';

export interface BasicInfoParams {
  quote: BuyQuote;
}

export const createBasicInfoNavDetails =
  createNavigationDetails<BasicInfoParams>(Routes.DEPOSIT.BASIC_INFO);

export interface BasicInfoFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  dob: string;
  ssn: string;
}

// TODO: Country Code must be dynamic and not hardcoded to USA
const COUNTRY_CODE = '1';

const BasicInfo = (): JSX.Element => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { quote } = useParams<BasicInfoParams>();

  const initialFormData: BasicInfoFormData = {
    firstName: '',
    lastName: '',
    mobileNumber: '',
    dob: '',
    ssn: '',
  };

  const validateForm = (
    formData: BasicInfoFormData,
  ): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.mobileNumber.trim()) {
      errors.mobileNumber = 'Phone number is required';
    }

    if (!formData.dob.trim()) {
      errors.dob = 'Date of birth is required';
    }

    if (!formData.ssn.trim()) {
      errors.ssn = 'Social security number is required';
    }

    return errors;
  };

  const { formData, errors, handleChange, validateFormData } =
    useForm<BasicInfoFormData>({
      initialFormData,
      validateForm,
    });

  const handleFormDataChange = useCallback(
    (field: keyof BasicInfoFormData) => (value: string) => {
      handleChange(field, value);
    },
    [handleChange],
  );

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.basic_info.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(() => {
    if (validateFormData()) {
      const formattedFormData = {
        ...formData,
        mobileNumber: `+${COUNTRY_CODE}${formData.mobileNumber}`,
      };

      navigation.navigate(
        ...createEnterAddressNavDetails({ formData: formattedFormData, quote }),
      );
    }
  }, [navigation, validateFormData, formData, quote]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={2} />
          <Text style={styles.subtitle}>
            {strings('deposit.basic_info.subtitle')}
          </Text>
          <View style={styles.nameInputRow}>
            <DepositTextField
              label="First Name"
              placeholder="John"
              value={formData.firstName}
              onChangeText={handleFormDataChange('firstName')}
              error={errors.firstName}
              returnKeyType="next"
              testID="first-name-input"
              containerStyle={styles.nameInputContainer}
            />

            <DepositTextField
              label="Last Name"
              placeholder="Smith"
              value={formData.lastName}
              onChangeText={handleFormDataChange('lastName')}
              error={errors.lastName}
              returnKeyType="next"
              testID="last-name-input"
              containerStyle={styles.nameInputContainer}
            />
          </View>
          <DepositPhoneField
            // TODO: Add internationalization for phone number format
            // TODO: Automatic formatting
            countryCode={COUNTRY_CODE}
            label="Phone Number"
            placeholder="(234) 567-8910"
            value={formData.mobileNumber}
            onChangeText={handleFormDataChange('mobileNumber')}
            error={errors.mobileNumber}
            testID="phone-number-input"
            returnKeyType="next"
          />

          <DepositTextField
            // TODO: Add internationalization for date format
            // TODO: Add date picker functionality
            startAccessory={
              <IonicIcon
                name="calendar-outline"
                size={20}
                style={styles.calendarIcon}
              />
            }
            label="Date of Birth"
            placeholder="MM/DD/YYYY"
            value={formData.dob}
            onChangeText={handleFormDataChange('dob')}
            error={errors.dob}
            returnKeyType="next"
            keyboardType="number-pad"
            testID="dob-input"
          />

          <DepositTextField
            // TODO: Contextual rendering of SSN input based on country
            // TODO: Automatically format SSN input?
            label="Social Security Number"
            placeholder="XXX-XX-XXXX"
            value={formData.ssn}
            onChangeText={handleFormDataChange('ssn')}
            error={errors.ssn}
            returnKeyType="done"
            keyboardType="number-pad"
            secureTextEntry
            testID="ssn-input"
          />
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <Row>
            <StyledButton
              type="confirm"
              onPress={handleOnPressContinue}
              testID="continue-button"
            >
              {strings('deposit.basic_info.continue')}
            </StyledButton>
          </Row>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default BasicInfo;
