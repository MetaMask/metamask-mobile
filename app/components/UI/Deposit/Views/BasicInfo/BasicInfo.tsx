import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Text from '../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import Row from '../../../Ramp/components/Row';
import { getDepositNavbarOptions } from '../../../Navbar';
import { useStyles } from '../../../../hooks/useStyles';
import styleSheet from './BasicInfo.styles';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import DepositTextField from '../../components/DepositTextField';
import { useForm } from '../../hooks/useForm';
import DepositPhoneField from '../../components/DepositPhoneField';
import DepositProgressBar from '../../components/DepositProgressBar';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { createEnterAddressNavDetails } from '../EnterAddress/EnterAddress';

export const createBasicInfoNavDetails = createNavigationDetails(
  Routes.DEPOSIT.BASIC_INFO,
);

interface FormData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  dateOfBirth: string;
  ssn: string;
}

const BasicInfo = (): JSX.Element => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const initialFormData: FormData = {
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    ssn: '',
  };

  // TODO: Add more comprehensive validation logic
  const validateForm = (data: FormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!data.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!data.phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    }

    if (!data.dateOfBirth.trim()) {
      errors.dateOfBirth = 'Date of birth is required';
    }

    if (!data.ssn.trim()) {
      errors.ssn = 'Social security number is required';
    }

    return errors;
  };

  const { formData, errors, handleChange, validateFormData } =
    useForm<FormData>({
      initialFormData,
      validateForm,
    });

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
      // TODO: Send form data here?
      navigation.navigate(...createEnterAddressNavDetails());
    }
  }, [navigation, validateFormData]);

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
              onChangeText={(text) => handleChange('firstName', text)}
              error={errors.firstName}
              returnKeyType="next"
              testID="first-name-input"
              containerStyle={styles.nameInputContainer}
            />

            <DepositTextField
              label="Last Name"
              placeholder="Smith"
              value={formData.lastName}
              onChangeText={(text) => handleChange('lastName', text)}
              error={errors.lastName}
              returnKeyType="next"
              testID="last-name-input"
              containerStyle={styles.nameInputContainer}
            />
          </View>
          <DepositPhoneField
            // TODO: Add internationalization for phone number format
            // TODO: Automatic formatting
            label="Phone Number"
            placeholder="(234) 567-8910"
            value={formData.phoneNumber}
            onChangeText={(text) => handleChange('phoneNumber', text)}
            error={errors.phoneNumber}
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
            value={formData.dateOfBirth}
            onChangeText={(text) => handleChange('dateOfBirth', text)}
            error={errors.dateOfBirth}
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
            onChangeText={(text) => handleChange('ssn', text)}
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
