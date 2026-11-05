import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Checkbox,
  ContentVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  Text,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { VbaPartnerTermsSelectorsIDs } from './VerifyIdentity.testIds';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import { trackIdentityTerms } from '../../utils/identityTermsAnalytics';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import CapsuleGlass from '../../../../../component-library/components-temp/CapsuleGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import SentenceWithLinks, {
  type SentenceLink,
} from '../../components/SentenceWithLinks';
import {
  findDisclaimerByKeyword,
  groupDisclaimers,
} from './partnerDisclaimers';
import { IDENTITY_TERMS_TOTAL_PAGES } from './identityTermsPages';

const DisclaimerRow = ({
  disclaimer,
}: {
  disclaimer: KycCatalogDisclaimerLink;
}) => {
  const openLink = useCallback(
    () => Linking.openURL(disclaimer.url),
    [disclaimer.url],
  );

  return (
    <ListItem
      isInteractive
      variant={ContentVariant.OneLine}
      title={disclaimer.title}
      endAccessory={
        <Icon
          name={IconName.Arrow2UpRight}
          size={IconSize.Md}
          color={IconColor.IconDefault}
        />
      }
      onPress={openLink}
      accessibilityRole="link"
      testID={`${VbaPartnerTermsSelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`}
    />
  );
};

const GroupTitle = ({ title }: { title: string }) => (
  <Text
    variant={TextVariant.BodyMd}
    fontWeight={FontWeight.Bold}
    twClassName="px-4 pb-1 pt-4"
  >
    {title}
  </Text>
);

interface VbaPartnerTermsProps {
  /** idOS and SumSub documents loaded on page 1. */
  disclaimers: KycCatalogDisclaimerLink[];
  onAgree: () => void | Promise<void>;
  onBack: () => void;
}

/**
 * Page 2 of identity verification: who the verification partners are, their
 * legal documents, and the explicit biometric consent idOS requires.
 *
 * The document rows come from the catalog rather than a fixed list, because it
 * is country-dependent and legal publishes new versions into it. The biometric
 * checkbox gates this page's CTA only: the KYC controller has no field for a
 * separate biometric consent, so the consent recorded downstream is the idOS
 * catalog documents (see `useLaunchSumSub`).
 */
const VbaPartnerTerms = ({
  disclaimers,
  onAgree,
  onBack,
}: VbaPartnerTermsProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const tw = useTailwind();
  const [hasBiometricConsent, setHasBiometricConsent] = useState(false);

  useScreenPerformance({
    config: KYC_SCREEN_PERFORMANCE_CONFIG,
    screenId: KYC_SCREEN_ID.PROVIDER_TERMS_MODAL,
    contentReady: true,
  });

  useEffect(() => {
    trackIdentityTerms('page2_viewed');
  }, []);

  const { idos, kycProvider } = useMemo(
    () => groupDisclaimers(disclaimers),
    [disclaimers],
  );

  // The acknowledgement names one SumSub document. Any further provider
  // documents still render as rows so none is silently dropped.
  const [sumsubNotice, ...extraProviderDocuments] = kycProvider;

  const toSentenceLink = useCallback(
    (
      label: string,
      disclaimer: KycCatalogDisclaimerLink | undefined,
      testID: string,
    ): SentenceLink => ({
      label,
      url: disclaimer?.url,
      testID,
    }),
    [],
  );

  const handleAgree = useCallback(async () => {
    trackIdentityTerms('page2_accepted');
    await onAgree();
  }, [onAgree]);

  const stepIndicator = (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      accessibilityLabel={strings(
        'wallet.home_onboarding_steps.progress_a11y',
        {
          current: IDENTITY_TERMS_TOTAL_PAGES,
          total: IDENTITY_TERMS_TOTAL_PAGES,
        },
      )}
      testID={VbaPartnerTermsSelectorsIDs.STEP_INDICATOR}
    >
      {strings('virtual_bank_account.verify_identity.step_indicator', {
        current: IDENTITY_TERMS_TOTAL_PAGES,
        total: IDENTITY_TERMS_TOTAL_PAGES,
      })}
    </Text>
  );

  return (
    <Box twClassName="flex-1 bg-default">
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1')}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          onBack={onBack}
          backButtonProps={{
            testID: VbaPartnerTermsSelectorsIDs.BACK_BUTTON,
          }}
          endAccessory={
            isGlassHeader ? (
              <CapsuleGlass twClassName="px-3">{stepIndicator}</CapsuleGlass>
            ) : (
              <Box twClassName="pr-1">{stepIndicator}</Box>
            )
          }
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow pb-4')}
          testID={VbaPartnerTermsSelectorsIDs.CONTAINER}
        >
          <TitleStandard
            title={strings('virtual_bank_account.partner_terms.title')}
            bottomLabel={strings(
              'virtual_bank_account.partner_terms.description',
            )}
            twClassName="px-4 pb-4"
          />

          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
            twClassName="px-4 pb-2 uppercase"
          >
            {strings('virtual_bank_account.partner_terms.section_title')}
          </Text>

          <Box twClassName="mx-4 overflow-hidden rounded-xl border border-muted">
            <GroupTitle
              title={strings(
                'virtual_bank_account.partner_terms.idos_group_title',
              )}
            />
            {idos.map((disclaimer) => (
              <DisclaimerRow key={disclaimer.id} disclaimer={disclaimer} />
            ))}

            <Box twClassName="h-px bg-muted" />

            <GroupTitle
              title={strings(
                'virtual_bank_account.partner_terms.sumsub_group_title',
              )}
            />
            <Box twClassName="px-4 pb-4">
              <SentenceWithLinks
                i18nKey="virtual_bank_account.partner_terms.sumsub_acknowledgement"
                variant={TextVariant.BodySm}
                testID={VbaPartnerTermsSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT}
                links={{
                  notice: toSentenceLink(
                    strings('virtual_bank_account.partner_terms.sumsub_notice'),
                    sumsubNotice,
                    VbaPartnerTermsSelectorsIDs.SUMSUB_NOTICE_LINK,
                  ),
                }}
              />
            </Box>
            {extraProviderDocuments.map((disclaimer) => (
              <DisclaimerRow key={disclaimer.id} disclaimer={disclaimer} />
            ))}
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mx-4 mt-4 gap-3 rounded-xl border border-muted p-4"
          >
            <Box twClassName="flex-1">
              <SentenceWithLinks
                i18nKey="virtual_bank_account.partner_terms.biometric_consent"
                variant={TextVariant.BodySm}
                testID={VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT}
                links={{
                  privacyNotice: toSentenceLink(
                    strings(
                      'virtual_bank_account.partner_terms.biometric_consent_privacy_notice',
                    ),
                    findDisclaimerByKeyword(idos, 'privacy'),
                    VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_LINK,
                  ),
                }}
              />
            </Box>
            <Checkbox
              isSelected={hasBiometricConsent}
              onChange={setHasBiometricConsent}
              accessibilityLabel={strings(
                'virtual_bank_account.partner_terms.biometric_consent',
                {
                  privacyNotice: strings(
                    'virtual_bank_account.partner_terms.biometric_consent_privacy_notice',
                  ),
                },
              )}
              testID={VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX}
            />
          </Box>
        </ScrollView>

        <Box twClassName="gap-4 border-t border-muted px-4 pb-2 pt-4">
          <SentenceWithLinks
            i18nKey="virtual_bank_account.partner_terms.agreement"
            twClassName="text-center"
            testID={VbaPartnerTermsSelectorsIDs.AGREEMENT}
            links={{
              termsAndConditions: toSentenceLink(
                strings('virtual_bank_account.partner_terms.agreement_terms'),
                findDisclaimerByKeyword(idos, 'terms'),
                VbaPartnerTermsSelectorsIDs.AGREEMENT_TERMS_LINK,
              ),
            }}
          />
          <Button
            variant={ButtonVariant.Primary}
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!hasBiometricConsent}
            onPress={handleAgree}
            testID={VbaPartnerTermsSelectorsIDs.AGREE_BUTTON}
          >
            {strings('virtual_bank_account.partner_terms.button')}
          </Button>
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default VbaPartnerTerms;
