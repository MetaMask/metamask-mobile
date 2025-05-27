import React, { useCallback, useEffect, useRef } from 'react';
import { TextInput, View } from 'react-native';
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
import { useForm } from './useForm';

// TODO: move this to Enter address view when it created
export const createEnterAddressNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ENTER_ADDRESS,
);

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
    } else if (!/^\d{10}$/.test(data.phoneNumber.replace(/\D/g, ''))) {
      errors.phoneNumber = 'Please enter a valid 10-digit phone number';
    }

    if (!data.dateOfBirth.trim()) {
      errors.dateOfBirth = 'Date of birth is required';
    } else if (!/^\d{2}\/\d{2}\/\d{4}$/.test(data.dateOfBirth)) {
      errors.dateOfBirth = 'Please enter date in MM/DD/YYYY format';
    }

    if (!data.ssn.trim()) {
      errors.ssn = 'Social security number is required';
    } else if (!/^\d{9}$/.test(data.ssn.replace(/\D/g, ''))) {
      errors.ssn = 'Please enter a valid 9-digit SSN';
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
      navigation.navigate(...createEnterAddressNavDetails());
    }
  }, [navigation, validateFormData]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content>
          <Text style={styles.heading}>Personal Information</Text>
          <View style={styles.nameInputRow}>
            <DepositTextField
              label="First Name"
              placeholder="Enter your first name"
              value={formData.firstName}
              onChangeText={(text) => handleChange('firstName', text)}
              error={errors.firstName}
              returnKeyType="next"
              testID="first-name-input"
              containerStyle={styles.nameInputContainer}
            />

            <DepositTextField
              label="Last Name"
              placeholder="Enter your last name"
              value={formData.lastName}
              onChangeText={(text) => handleChange('lastName', text)}
              error={errors.lastName}
              returnKeyType="next"
              testID="last-name-input"
              containerStyle={styles.nameInputContainer}
            />
          </View>

          <DepositTextField
            label="Phone Number"
            placeholder="(555) 555-5555"
            value={formData.phoneNumber}
            onChangeText={(text) => handleChange('phoneNumber', text)}
            error={errors.phoneNumber}
            returnKeyType="next"
            keyboardType="phone-pad"
            testID="phone-number-input"
          />

          <DepositTextField
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
