import React, { useCallback, useEffect, useRef } from 'react';
import { Image, Linking, ScrollView } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import { useStyles } from '../../../../../component-library/hooks';
import styleSheet from '../../Deposit/Views/VerifyIdentity/VerifyIdentity.styles';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { getDepositNavbarOptions } from '../../../Navbar';
import { strings } from '../../../../../../locales/i18n';
import VerifyIdentityImage from '../../Deposit/assets/verifyIdentityIllustration.png';
import PoweredByTransak from '../../Deposit/components/PoweredByTransak';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import {
  TRANSAK_TERMS_URL_US,
  TRANSAK_TERMS_URL_WORLD,
  CONSENSYS_PRIVACY_POLICY_URL,
  TRANSAK_URL,
} from '../../Deposit/constants/constants';
import { useRampsUserRegion } from '../../hooks/useRampsUserRegion';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const V2VerifyIdentity = () => {
  const navigation = useNavigation();
  const { styles, theme } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useAnalytics();
  const { userRegion } = useRampsUserRegion();

  const regionIsoCode = userRegion?.country?.isoCode || '';

  const navigateToEnterEmail = useCallback(() => {
    navigation.navigate(Routes.RAMP.ENTER_EMAIL as never);
  }, [navigation]);

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        { title: strings('deposit.verify_identity.navbar_title') },
        theme,
        () => {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.RAMPS_BACK_BUTTON_CLICKED)
              .addProperties({
                location: 'Verify Identity',
                ramp_type: 'UNIFIED_BUY_2',
              })
              .build(),
          );
        },
      ),
    );
  }, [navigation, theme, trackEvent, createEventBuilder]);

  const hasTrackedScreenViewRef = useRef(false);
  useEffect(() => {
    if (hasTrackedScreenViewRef.current) return;
    hasTrackedScreenViewRef.current = true;
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_SCREEN_VIEWED)
        .addProperties({
          location: 'Verify Identity',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
  }, [trackEvent, createEventBuilder]);

  const handleSubmit = useCallback(async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_TERMS_CONSENT_CLICKED)
        .addProperties({
          location: 'Verify Identity',
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    navigateToEnterEmail();
  }, [navigateToEnterEmail, trackEvent, createEventBuilder]);

  const handleTransakLink = useCallback(() => {
    let urlDomain: string = TRANSAK_URL;
    try {
      urlDomain = new URL(TRANSAK_URL).hostname;
    } catch {
      // use TRANSAK_URL as fallback for analytics if parse fails
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_EXTERNAL_LINK_CLICKED)
        .addProperties({
          location: 'Verify Identity',
          external_link_description: 'Transak',
          url_domain: urlDomain,
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    Linking.openURL(TRANSAK_URL);
  }, [trackEvent, createEventBuilder]);

  const handlePrivacyPolicyLink = useCallback(() => {
    let urlDomain: string = CONSENSYS_PRIVACY_POLICY_URL;
    try {
      urlDomain = new URL(CONSENSYS_PRIVACY_POLICY_URL).hostname;
    } catch {
      // use raw URL as fallback for analytics if parse fails
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_EXTERNAL_LINK_CLICKED)
        .addProperties({
          location: 'Verify Identity',
          external_link_description: 'Privacy Policy',
          url_domain: urlDomain,
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    Linking.openURL(CONSENSYS_PRIVACY_POLICY_URL);
  }, [trackEvent, createEventBuilder]);

  const handleTransakTermsLink = useCallback(() => {
    const termsUrl =
      regionIsoCode === 'US' ? TRANSAK_TERMS_URL_US : TRANSAK_TERMS_URL_WORLD;
    let urlDomain: string = termsUrl;
    try {
      urlDomain = new URL(termsUrl).hostname;
    } catch {
      // use termsUrl as fallback for analytics if parse fails
    }
    trackEvent(
      createEventBuilder(MetaMetricsEvents.RAMPS_EXTERNAL_LINK_CLICKED)
        .addProperties({
          location: 'Verify Identity',
          external_link_description: 'Transak Terms',
          url_domain: urlDomain,
          ramp_type: 'UNIFIED_BUY_2',
        })
        .build(),
    );
    Linking.openURL(termsUrl);
  }, [regionIsoCode, trackEvent, createEventBuilder]);

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

export default V2VerifyIdentity;
