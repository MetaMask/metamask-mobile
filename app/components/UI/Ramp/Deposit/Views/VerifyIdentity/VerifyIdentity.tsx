import React, { useCallback, useEffect } from 'react';
import { Image, TouchableOpacity } from 'react-native';
import Text from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './VerifyIdentity.styles';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import {
  createNavigationDetails,
  useParams,
} from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import VerifyIdentityImage from '../../assets/verifyIdentityIllustration.png';
import { BuyQuote } from '@consensys/native-ramps-sdk';
import PoweredByTransak from '../../components/PoweredByTransak';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import { useDepositRouting } from '../../hooks/useDepositRouting';

export interface VerifyIdentityParams {
  quote: BuyQuote;
  cryptoCurrencyChainId: string;
  paymentMethodId: string;
}

export const createVerifyIdentityNavDetails =
  createNavigationDetails<VerifyIdentityParams>(Routes.DEPOSIT.VERIFY_IDENTITY);

const VerifyIdentity = () => {
  const navigation = useNavigation();

  const { styles, theme } = useStyles(styleSheet, {});

  const { quote, cryptoCurrencyChainId, paymentMethodId } =
    useParams<VerifyIdentityParams>();

  const { navigateToEnterEmail } = useDepositRouting({
    cryptoCurrencyChainId,
    paymentMethodId,
  });

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.verify_identity.title') },
        theme,
      ),
    );
  }, [navigation, theme]);

  const handleSubmit = useCallback(async () => {
    navigateToEnterEmail({ quote });
  }, [navigateToEnterEmail, quote]);

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
        <ScreenLayout.Content style={styles.footerContent}>
          <Button
            size={ButtonSize.Lg}
            onPress={handleSubmit}
            label={strings('deposit.verify_identity.button')}
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
          />
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default VerifyIdentity;
