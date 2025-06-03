import React, { useEffect } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import Text from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from './VerifyIdentity.styles';
import StyledButton from '../../../StyledButton';
import ScreenLayout from '../../../Ramp/components/ScreenLayout';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import VerifyIdentityImage from '../../assets/verifyIdentityIllustration.png';
import { createBasicInfoNavDetails } from '../BasicInfo/BasicInfo';

export const createVerifyIdentityNavDetails = createNavigationDetails(
  Routes.DEPOSIT.VERIFY_IDENTITY,
);

const VerifyIdentity = () => {
  const navigation = useNavigation();

  const { styles, theme } = useStyles(styleSheet, {});

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.verify_identity.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleSubmit = async () => {
    navigation.navigate(...createBasicInfoNavDetails());
  };

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScreenLayout.Content grow>
          <Image
            source={VerifyIdentityImage}
            resizeMode={'contain'}
            style={styles.image}
          />
          <Text style={styles.description}>
            {strings('deposit.verify_identity.description')}
          </Text>

          <TouchableOpacity>
            <Text style={styles.privacyPolicyLink}>
              {strings('deposit.verify_identity.privacy_policy_link')}
            </Text>
          </TouchableOpacity>
        </ScreenLayout.Content>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content>
          <StyledButton
            type="confirm"
            onPress={handleSubmit}
            accessibilityRole="button"
            accessible
          >
            {strings('deposit.verify_identity.button')}
          </StyledButton>
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default VerifyIdentity;
