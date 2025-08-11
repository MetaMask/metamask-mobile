import React, { useCallback, useEffect } from 'react';
import { Image, Linking, ScrollView } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../../component-library/hooks';
import styleSheet from './VerifyIdentity.styles';
import ScreenLayout from '../../../Aggregator/components/ScreenLayout';
import { createNavigationDetails } from '../../../../../../util/navigation/navUtils';
import Routes from '../../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../../Navbar';
import { strings } from '../../../../../../../locales/i18n';
import VerifyIdentityImage from '../../assets/verifyIdentityIllustration.png';
import PoweredByTransak from '../../components/PoweredByTransak';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import {
  TRANSAK_TERMS_URL_US,
  TRANSAK_TERMS_URL_WORLD,
  CONSENSYS_PRIVACY_POLICY_URL,
  TRANSAK_URL,
} from '../../constants/constants';
import { useDepositSDK } from '../../sdk';
import { createEnterEmailNavDetails } from '../EnterEmail/EnterEmail';
import { endTrace, TraceName } from '../../../../../../util/trace';

export const createVerifyIdentityNavDetails = createNavigationDetails(
  Routes.DEPOSIT.VERIFY_IDENTITY,
);

const VerifyIdentity = () => {
  const navigation = useNavigation();

  const { styles, theme } = useStyles(styleSheet, {});

  const { selectedRegion } = useDepositSDK();

  const navigateToEnterEmail = useCallback(() => {
    navigation.navigate(...createEnterEmailNavDetails({}));
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.verify_identity.navbar_title') },
        theme,
      ),
    );

    endTrace({
      name: TraceName.DepositContinueFlow,
      data: {
        destination: Routes.DEPOSIT.VERIFY_IDENTITY,
      },
    });

    endTrace({
      name: TraceName.DepositInputOtp,
      data: {
        destination: Routes.DEPOSIT.VERIFY_IDENTITY,
      },
    });
  }, [navigation, theme]);

  const handleSubmit = useCallback(async () => {
    navigateToEnterEmail();
  }, [navigateToEnterEmail]);

  const handleTransakLink = useCallback(() => {
    Linking.openURL(TRANSAK_URL);
  }, []);

  const handlePrivacyPolicyLink = useCallback(() => {
    Linking.openURL(CONSENSYS_PRIVACY_POLICY_URL);
  }, []);

  const handleTransakTermsLink = useCallback(() => {
    Linking.openURL(
      selectedRegion?.isoCode === 'US'
        ? TRANSAK_TERMS_URL_US
        : TRANSAK_TERMS_URL_WORLD,
    );
  }, [selectedRegion?.isoCode]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <ScreenLayout.Content grow>
            <Image
              source={VerifyIdentityImage}
              resizeMode={'contain'}
              style={styles.image}
            />
            <Text variant={TextVariant.HeadingLG} style={styles.title}>
              {strings('deposit.verify_identity.title')}
            </Text>

            <Text style={styles.description}>
              {strings('deposit.verify_identity.description_1')}
            </Text>

            <Text style={styles.description}>
              <Text style={styles.linkText} onPress={handleTransakLink}>
                {strings('deposit.verify_identity.description_2_transak')}
              </Text>
              {strings('deposit.verify_identity.description_2_rest')}
            </Text>

            <Text style={styles.descriptionCompact}>
              {strings('deposit.verify_identity.description_3_part1')}
              <Text
                style={styles.linkText}
                onPress={handlePrivacyPolicyLink}
                testID="privacy-policy-link-1"
              >
                {strings(
                  'deposit.verify_identity.description_3_privacy_policy',
                )}
              </Text>
              {strings('deposit.verify_identity.description_3_part2')}
            </Text>
          </ScreenLayout.Content>
        </ScrollView>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <Text
            variant={TextVariant.BodyXS}
            color={TextColor.Muted}
            style={styles.agreementText}
          >
            {strings('deposit.verify_identity.agreement_text_part1')}
            <Text
              variant={TextVariant.BodyXS}
              color={TextColor.Muted}
              style={styles.linkText}
              onPress={handleTransakTermsLink}
            >
              {strings('deposit.verify_identity.agreement_text_transak_terms')}
            </Text>
            {strings('deposit.verify_identity.agreement_text_and')}
            <Text
              variant={TextVariant.BodyXS}
              color={TextColor.Muted}
              style={styles.linkText}
              onPress={handlePrivacyPolicyLink}
              testID="privacy-policy-link-2"
            >
              {strings('deposit.verify_identity.agreement_text_privacy_policy')}
            </Text>
            {strings('deposit.verify_identity.agreement_text_part2')}
          </Text>
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
