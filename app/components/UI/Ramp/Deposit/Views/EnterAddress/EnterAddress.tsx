import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Text from '../../../../../../component-library/components/Texts/Text';
import StyledButton from '../../../../StyledButton';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './EnterAddress.styles';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../../locales/i18n';
import DepositTextField from '../../components/DepositTextField';
import { useForm } from '../../hooks/useForm';
import DepositProgressBar from '../../components/DepositProgressBar';
import Row from '../../../Aggregator/components/Row';
import { BasicInfoFormData } from '../BasicInfo/BasicInfo';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';

export const createEnterAddressNavDetails = createNavigationDetails(
  Routes.DEPOSIT.ENTER_ADDRESS,
);

interface AddressFormData {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postCode: string;
  countryCode: string;
}

const EnterAddress = (): JSX.Element => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});

  const route =
    useRoute<
      RouteProp<Record<string, { formData: BasicInfoFormData }>, string>
    >();
  const { formData: basicInfoFormData } = route.params;

  const initialFormData: AddressFormData = {
    addressLine1: '',
    addressLine2: '',
    state: '',
    city: '',
    postCode: '',
    countryCode: '',
  };

  const validateForm = (data: AddressFormData): Record<string, string> => {
    const errors: Record<string, string> = {};

    if (!data.addressLine1.trim()) {
      errors.addressLine1 = 'Address line 1 is required';
    }

    if (!data.city.trim()) {
      errors.city = 'City is required';
    }

    if (!data.state.trim()) {
      errors.state = 'State/Region is required';
    }

    if (!data.postCode.trim()) {
      errors.postCode = 'Postal/Zip Code is required';
    }

    if (!data.countryCode.trim()) {
      errors.countryCode = 'Country is required';
    }

    return errors;
  };

  const { formData, errors, handleChange, validateFormData } =
    useForm<AddressFormData>({
      initialFormData,
      validateForm,
    });

  const combinedFormData = {
    ...basicInfoFormData,
    ...formData,
  };

  const [{ data: response, error, isFetching }, postKycForm] =
    useDepositSdkMethod(
      {
        method: 'patchUser',
        onMount: false,
      },
      combinedFormData,
    );

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.enter_address.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleOnPressContinue = useCallback(async () => {
    if (validateFormData()) {
      await postKycForm({
        ...basicInfoFormData,
        ...formData,
      });

      if (response && !error) {
        navigation.navigate(Routes.DEPOSIT.KYC_PROCESSING);
      } else {
        console.error('Error submitting form:', error);
      }
    }
  }, [
    basicInfoFormData,
    response,
    error,
    formData,
    navigation,
    postKycForm,
    validateFormData,
  ]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <DepositProgressBar steps={4} currentStep={3} />
          <Text style={styles.subtitle}>
            {strings('deposit.enter_address.subtitle')}
          </Text>

          <DepositTextField
            label={strings('deposit.enter_address.address_line_1')}
            placeholder={strings('deposit.enter_address.address_line_1')}
            value={formData.addressLine1}
            onChangeText={(text) => handleChange('addressLine1', text)}
            error={errors.addressLine1}
            returnKeyType="next"
            testID="address-line-1-input"
          />

          <DepositTextField
            label={strings('deposit.enter_address.address_line_2')}
            placeholder={strings('deposit.enter_address.address_line_2')}
            value={formData.addressLine2}
            onChangeText={(text) => handleChange('addressLine2', text)}
            returnKeyType="next"
            testID="address-line-2-input"
          />

          <View style={styles.nameInputRow}>
            <DepositTextField
              label={strings('deposit.enter_address.city')}
              placeholder={strings('deposit.enter_address.city')}
              value={formData.city}
              onChangeText={(text) => handleChange('city', text)}
              error={errors.city}
              returnKeyType="next"
              testID="city-input"
              containerStyle={styles.nameInputContainer}
            />

            <DepositTextField
              label={strings('deposit.enter_address.state')}
              placeholder={strings('deposit.enter_address.state')}
              value={formData.state}
              onChangeText={(text) => handleChange('state', text)}
              error={errors.state}
              returnKeyType="next"
              testID="state-input"
              containerStyle={styles.nameInputContainer}
            />
          </View>

          <View style={styles.nameInputRow}>
            <DepositTextField
              label={strings('deposit.enter_address.postal_code')}
              placeholder={strings('deposit.enter_address.postal_code')}
              value={formData.postCode}
              onChangeText={(text) => handleChange('postCode', text)}
              error={errors.postCode}
              returnKeyType="next"
              testID="postal-code-input"
              containerStyle={styles.nameInputContainer}
            />

            <DepositTextField
              label={strings('deposit.enter_address.country')}
              placeholder={strings('deposit.enter_address.country')}
              value={formData.countryCode}
              onChangeText={(text) => handleChange('countryCode', text)}
              error={errors.countryCode}
              returnKeyType="done"
              testID="country-input"
              containerStyle={styles.nameInputContainer}
            />
          </View>
        </ScreenLayout.Content>
        <ScreenLayout.Footer>
          <ScreenLayout.Content>
            <Row>
              <StyledButton
                type="confirm"
                onPress={handleOnPressContinue}
                testID="address-continue-button"
                disabled={isFetching}
              >
                {strings('deposit.enter_address.continue')}
              </StyledButton>
            </Row>
          </ScreenLayout.Content>
        </ScreenLayout.Footer>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
};

export default EnterAddress;
