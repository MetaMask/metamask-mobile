import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Text from '../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import Row from '../../../Aggregator/components/Row';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './BasicInfo.styles';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import DepositTextField from '../../components/DepositTextField';
import { useForm } from '../../hooks/useForm';
import DepositPhoneField from '../../components/DepositPhoneField';
import DepositProgressBar from '../../components/DepositProgressBar';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import { createEnterAddressNavDetails } from '../EnterAddress/EnterAddress';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import { BuyQuote, KycForm } from '@consensys/native-ramps-sdk';

export const createBasicInfoNavDetails = createNavigationDetails(
  Routes.DEPOSIT.BASIC_INFO,
);

export interface BasicInfoFormData {
  firstName: string;
  lastName: string;
  mobileNumber: string;
  dob: string;
  ssn: string;
}

// const formDetailsExample: [
//   {
//     cols: { lg: 6; md: 6; xs: 6 };
//     disabled: false;
//     id: 'firstName';
//     isRequired: true;
//     name: 'First Name';
//     placeholder: 'Satoshi';
//     regex: '^(?!\\s+$).{1,35}$';
//     regexErrorMessage: '"First Name" is a mandatory field. Please enter a valid first name less than 36 characters!';
//     type: 'text';
//     value: '';
//   },
//   {
//     cols: { lg: 6; md: 6; xs: 6 };
//     disabled: false;
//     id: 'lastName';
//     isRequired: true;
//     name: 'Last Name';
//     placeholder: 'Nakamoto';
//     regex: '^(?!\\s+$).{1,35}$';
//     regexErrorMessage: '"Last Name" is a mandatory field. Please enter a valid last name less than 36 characters!';
//     type: 'text';
//     value: '';
//   },
//   {
//     cols: { lg: 12; md: 12; xs: 12 };
//     disabled: false;
//     format: '[country code][national number]';
//     id: 'mobileNumber';
//     isRequired: true;
//     name: 'Mobile number';
//     placeholder: '[country code][national number]';
//     regex: '^\\+(?:[0-9]●?){6,14}[0-9]$';
//     type: 'text';
//     value: '';
//   },
//   {
//     cols: { lg: 12; md: 12; xs: 12 };
//     disabled: false;
//     format: 'DD-MM-YYYY';
//     id: 'dob';
//     isRequired: true;
//     name: 'Date of birth';
//     placeholder: 'DD-MM-YYYY';
//     regex: '^(?:(?:31(\\/|-|\\.)(?:0?[13578]|1[02]))\\1|(?:(?:29|30)(\\/|-|\\.)(?:0?[13-9]|1[0-2])\\2))(?:(?:1[6-9]|[2-9]\\d)?\\d{2})$|^(?:29(\\/|-|\\.)0?2\\3(?:(?:(?:1[6-9]|[2-9]\\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00))))$|^(?:0?[1-9]|1\\d|2[0-8])(\\/|-|\\.)(?:(?:0?[1-9])|(?:1[0-2]))\\4(?:(?:1[6-9]|[2-9]\\d)?\\d{2})$';
//     type: 'date';
//     value: '';
//   },
// ];

const BasicInfo = (): JSX.Element => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const route =
    useRoute<RouteProp<Record<string, { quote: BuyQuote }>, string>>();
  const { quote } = route.params;

  const [{ data, error, isFetching }] = useDepositSdkMethod(
    'getKycForm',
    quote,
    { id: 'address' } as KycForm,
  );

  useEffect(() => {
    if (!isFetching && data) {
      console.log(data.fields); // this is the example form data above
    }
  }, [data, isFetching]);

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
      navigation.navigate(...createEnterAddressNavDetails({ formData }));
    }
  }, [formData, navigation, validateFormData]);

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
            value={formData.mobileNumber}
            onChangeText={(text) => handleChange('mobileNumber', text)}
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
            onChangeText={(text) => handleChange('dob', text)}
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
