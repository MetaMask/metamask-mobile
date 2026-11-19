import React, { useCallback, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  KeyValueRow,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { useStyles } from '../../../../hooks/useStyles';
import { useParams } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import PoweredByTransak from '../../components/PoweredByTransak';
import PrivacySection from '../../components/PrivacySection';
import styleSheet from './MicaConsent.styles';
import { MICA_CONSENT_TEST_IDS } from './MicaConsent.testIds';

export interface MicaConsentUserDetails {
  name: string;
  address: string;
  dateOfBirth: string;
  mobileNumber: string;
}

export interface MicaConsentParams {
  userDetails: MicaConsentUserDetails;
  termsOfUseUrl: string;
  privacyPolicyUrl: string;
  supportUrl: string;
}

/**
 * Navigates into the Ramp stack from outside it (for example Ramp Settings).
 */
export const createMicaConsentNavDetails = (params: MicaConsentParams) =>
  [
    Routes.RAMP.TOKEN_SELECTION,
    {
      screen: Routes.RAMP.TOKEN_SELECTION_ROOT,
      params: { screen: Routes.RAMP.MICA_CONSENT, params },
    },
  ] as const;

const MicaConsent = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const { styles } = useStyles(styleSheet, {});
  const { userDetails, termsOfUseUrl, privacyPolicyUrl, supportUrl } =
    useParams<MicaConsentParams>();

  const [hasDataConsent, setHasDataConsent] = useState(false);
  const [hasTermsConsent, setHasTermsConsent] = useState(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleAgree = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const detailRows = [
    {
      key: strings('deposit.mica_consent.name'),
      value: userDetails.name,
    },
    {
      key: strings('deposit.mica_consent.address'),
      value: userDetails.address,
    },
    {
      key: strings('deposit.mica_consent.date_of_birth'),
      value: userDetails.dateOfBirth,
    },
    {
      key: strings('deposit.mica_consent.mobile_number'),
      value: userDetails.mobileNumber,
    },
  ];

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          title={strings('deposit.basic_info.navbar_title')}
          onBack={handleBack}
          backButtonProps={{ testID: MICA_CONSENT_TEST_IDS.BACK_BUTTON }}
          includesTopInset
        />
        <ScrollView showsVerticalScrollIndicator={false}>
          <ScreenLayout.Content>
            <Text variant={TextVariant.HeadingMd} style={styles.title}>
              {strings('deposit.mica_consent.title')}
            </Text>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              style={styles.description}
            >
              {strings('deposit.mica_consent.description')}
            </Text>
            <Text variant={TextVariant.BodyMd} style={styles.reviewPrompt}>
              {strings('deposit.mica_consent.review_prompt')}
            </Text>
            <View
              style={styles.detailsCard}
              testID={MICA_CONSENT_TEST_IDS.DETAILS}
            >
              {detailRows.map((row) => (
                <KeyValueRow
                  key={row.key}
                  keyLabel={row.key}
                  value={row.value}
                  style={styles.detailRow}
                  valueTextProps={{
                    numberOfLines: 0,
                    style: styles.detailValue,
                  }}
                />
              ))}
            </View>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              style={styles.supportNotice}
            >
              {strings('deposit.mica_consent.support_notice_part1')}
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.PrimaryDefault}
                onPress={() => Linking.openURL(supportUrl)}
                testID={MICA_CONSENT_TEST_IDS.SUPPORT_LINK}
              >
                {strings('deposit.mica_consent.support_notice_link')}
              </Text>
              {strings('deposit.mica_consent.support_notice_part2')}
            </Text>
            <View style={styles.consents}>
              <Checkbox
                isSelected={hasDataConsent}
                onChange={setHasDataConsent}
                label={strings('deposit.mica_consent.data_consent')}
                testID={MICA_CONSENT_TEST_IDS.DATA_CONSENT_CHECKBOX}
              />
              <View style={styles.richConsentRow}>
                <Checkbox
                  isSelected={hasTermsConsent}
                  onChange={setHasTermsConsent}
                  testID={MICA_CONSENT_TEST_IDS.TERMS_CONSENT_CHECKBOX}
                />
                <Text
                  variant={TextVariant.BodyMd}
                  style={styles.richLabel}
                  onPress={() => setHasTermsConsent(!hasTermsConsent)}
                >
                  {strings('deposit.mica_consent.terms_consent_part1')}
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.PrimaryDefault}
                    onPress={() => Linking.openURL(termsOfUseUrl)}
                    testID={MICA_CONSENT_TEST_IDS.TERMS_OF_USE_LINK}
                  >
                    {strings('deposit.mica_consent.terms_of_use')}
                  </Text>
                  {strings('deposit.mica_consent.terms_consent_part2')}
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.PrimaryDefault}
                    onPress={() => Linking.openURL(privacyPolicyUrl)}
                    testID={MICA_CONSENT_TEST_IDS.PRIVACY_POLICY_LINK}
                  >
                    {strings('deposit.mica_consent.privacy_policy')}
                  </Text>
                  {strings('deposit.mica_consent.terms_consent_part3')}
                </Text>
              </View>
            </View>
          </ScreenLayout.Content>
        </ScrollView>
      </ScreenLayout.Body>
      <ScreenLayout.Footer>
        <ScreenLayout.Content style={styles.footerContent}>
          <PrivacySection />
          <Button
            size={ButtonSize.Lg}
            variant={ButtonVariant.Primary}
            isFullWidth
            isDisabled={!hasDataConsent || !hasTermsConsent}
            onPress={handleAgree}
            testID={MICA_CONSENT_TEST_IDS.AGREE_BUTTON}
          >
            {strings('deposit.mica_consent.agree_button')}
          </Button>
          <PoweredByTransak name="powered-by-transak-logo" />
        </ScreenLayout.Content>
      </ScreenLayout.Footer>
    </ScreenLayout>
  );
};

export default MicaConsent;
