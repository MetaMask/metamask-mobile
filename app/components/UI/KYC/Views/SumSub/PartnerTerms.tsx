import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Linking,
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonSize,
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
import {
  SUMSUB_BIOMETRICS_CONSENT_URL,
  SUMSUB_PERSONAL_DATA_PROCESSING_URL,
  SUMSUB_PRIVACY_NOTICE_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import { VbaPartnerTermsSelectorsIDs } from './VerifyIdentity.testIds';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import { trackIdentityTerms } from '../../utils/identityTermsAnalytics';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { selectGeolocationLocation } from '../../../../../selectors/geolocationController';
import CrossfadeButton from './CrossfadeButton';
import SentenceWithLinks, {
  type SentenceLink,
} from '../../components/SentenceWithLinks';
import {
  findDisclaimerByKeyword,
  groupDisclaimers,
  isListedIdosDocument,
} from './partnerDisclaimers';

/** Pages the identity-verification terms are split across ("2 of 2"). */
const TOTAL_PAGES = 2;

/**
 * How much of the consent row must be on screen to count as seen: the
 * checkbox itself plus a little room, so the footer switches once the tick
 * target is visible rather than only when the whole sentence is.
 */
const CHECKBOX_VISIBLE_HEIGHT = 24;

const isUnitedStatesLocation = (location: string | undefined) =>
  location?.toUpperCase().split('-')[0] === 'US';

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
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
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
    twClassName="px-4 pb-1 pt-3"
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
  const isUsResident = isUnitedStatesLocation(
    useSelector(selectGeolocationLocation),
  );
  const tw = useTailwind();
  const [hasBiometricConsent, setHasBiometricConsent] = useState(false);
  const checkboxRef = useRef<{ toggle: () => void }>(null);
  const [consentRowY, setConsentRowY] = useState<number>();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

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
  const listedIdosDocuments = useMemo(
    () => idos.filter(isListedIdosDocument),
    [idos],
  );

  const sumsubBiometrics = findDisclaimerByKeyword(kycProvider, 'biometric');
  const sumsubPrivacy = kycProvider.find(
    (disclaimer) =>
      disclaimer !== sumsubBiometrics &&
      disclaimer.key.toLowerCase().includes('privacy'),
  );
  const sumsubNotice =
    kycProvider.find(
      (disclaimer) =>
        disclaimer !== sumsubBiometrics &&
        disclaimer !== sumsubPrivacy &&
        disclaimer.key.toLowerCase().includes('notice'),
    ) ?? kycProvider.find((disclaimer) => disclaimer !== sumsubBiometrics);
  const linkedProviderIds = new Set(
    [sumsubNotice, sumsubPrivacy, sumsubBiometrics]
      .filter((disclaimer) => disclaimer !== undefined)
      .map((disclaimer) => disclaimer.id),
  );
  const extraProviderDocuments = kycProvider.filter(
    (disclaimer) => !linkedProviderIds.has(disclaimer.id),
  );

  const toSentenceLink = useCallback(
    (
      label: string,
      disclaimer: KycCatalogDisclaimerLink | undefined,
      testID: string,
      fallbackUrl?: string,
    ): SentenceLink => ({
      label,
      url: disclaimer?.url ?? fallbackUrl,
      testID,
    }),
    [],
  );

  const toggleBiometricConsent = useCallback(
    () => checkboxRef.current?.toggle(),
    [],
  );

  const handleAgree = useCallback(async () => {
    trackIdentityTerms('page2_accepted');
    await onAgree();
  }, [onAgree]);

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) =>
      setViewportHeight(event.nativeEvent.layout.height),
    [],
  );
  const handleConsentRowLayout = useCallback(
    (event: LayoutChangeEvent) => setConsentRowY(event.nativeEvent.layout.y),
    [],
  );
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) =>
      setScrollOffset(event.nativeEvent.contentOffset.y),
    [],
  );

  const isConsentRowInView =
    consentRowY !== undefined &&
    viewportHeight > 0 &&
    consentRowY + CHECKBOX_VISIBLE_HEIGHT <= scrollOffset + viewportHeight;

  let ctaLabel = strings(
    'virtual_bank_account.partner_terms.scroll_to_continue_button',
  );
  if (hasBiometricConsent) {
    ctaLabel = strings('virtual_bank_account.partner_terms.button');
  } else if (isConsentRowInView) {
    ctaLabel = strings(
      'virtual_bank_account.partner_terms.agree_to_consent_above_button',
    );
  }

  const stepIndicator = (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      accessibilityLabel={strings(
        'wallet.home_onboarding_steps.progress_a11y',
        {
          current: TOTAL_PAGES,
          total: TOTAL_PAGES,
        },
      )}
      testID={VbaPartnerTermsSelectorsIDs.STEP_INDICATOR}
    >
      {strings('virtual_bank_account.verify_identity.step_indicator', {
        current: TOTAL_PAGES,
        total: TOTAL_PAGES,
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
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow pb-4')}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onLayout={handleViewportLayout}
          testID={VbaPartnerTermsSelectorsIDs.CONTAINER}
        >
          <Box twClassName="px-4 pt-2">{stepIndicator}</Box>
          <TitleStandard
            title={strings('virtual_bank_account.partner_terms.title')}
            bottomLabel={strings(
              'virtual_bank_account.partner_terms.description',
            )}
            twClassName="px-4 pb-4"
          />

          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            twClassName="px-4 pb-2 pt-2"
          >
            {strings('virtual_bank_account.partner_terms.section_title')}
          </Text>

          <Box twClassName="mx-4 overflow-hidden rounded-xl bg-muted">
            <GroupTitle
              title={strings(
                'virtual_bank_account.partner_terms.idos_group_title',
              )}
            />
            {listedIdosDocuments.map((disclaimer) => (
              <DisclaimerRow key={disclaimer.id} disclaimer={disclaimer} />
            ))}

            <Box twClassName="h-px bg-muted" />

            <GroupTitle
              title={strings(
                'virtual_bank_account.partner_terms.sumsub_group_title',
              )}
            />
            <Box twClassName="px-4 pb-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={VbaPartnerTermsSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT}
              >
                <SentenceWithLinks
                  i18nKey="virtual_bank_account.partner_terms.sumsub_acknowledgement"
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                  links={{
                    notice: toSentenceLink(
                      strings(
                        'virtual_bank_account.partner_terms.sumsub_notice',
                      ),
                      sumsubNotice,
                      VbaPartnerTermsSelectorsIDs.SUMSUB_NOTICE_LINK,
                      SUMSUB_PERSONAL_DATA_PROCESSING_URL,
                    ),
                  }}
                />
                {isUsResident ? (
                  <SentenceWithLinks
                    i18nKey="virtual_bank_account.partner_terms.sumsub_acknowledgement_us_residents"
                    variant={TextVariant.BodySm}
                    color={TextColor.TextAlternative}
                    links={{
                      privacyNotice: toSentenceLink(
                        strings(
                          'virtual_bank_account.partner_terms.sumsub_privacy_notice',
                        ),
                        sumsubPrivacy,
                        VbaPartnerTermsSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK,
                        SUMSUB_PRIVACY_NOTICE_URL,
                      ),
                      biometricsConsent: toSentenceLink(
                        strings(
                          'virtual_bank_account.partner_terms.sumsub_biometrics_consent',
                        ),
                        sumsubBiometrics,
                        VbaPartnerTermsSelectorsIDs.SUMSUB_BIOMETRICS_LINK,
                        SUMSUB_BIOMETRICS_CONSENT_URL,
                      ),
                    }}
                  />
                ) : null}
              </Text>
            </Box>
            {extraProviderDocuments.map((disclaimer) => (
              <DisclaimerRow key={disclaimer.id} disclaimer={disclaimer} />
            ))}
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Start}
            twClassName="mx-4 mt-4 gap-3"
            onLayout={handleConsentRowLayout}
            testID={VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_ROW}
          >
            <Checkbox
              ref={checkboxRef}
              isSelected={hasBiometricConsent}
              onChange={setHasBiometricConsent}
              testID={VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX}
            />
            <Box twClassName="flex-1">
              <SentenceWithLinks
                i18nKey="virtual_bank_account.partner_terms.biometric_consent"
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                onPress={toggleBiometricConsent}
                suppressHighlighting
                testID={VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT}
                links={{
                  privacyNotice: toSentenceLink(
                    strings(
                      'virtual_bank_account.partner_terms.biometric_consent_privacy_notice',
                    ),
                    findDisclaimerByKeyword(idos, 'privacy-notice'),
                    VbaPartnerTermsSelectorsIDs.BIOMETRIC_CONSENT_LINK,
                  ),
                }}
              />
            </Box>
          </Box>
        </ScrollView>

        <Box twClassName="gap-4 border-t border-muted px-4 pb-2 pt-4">
          <SentenceWithLinks
            i18nKey="virtual_bank_account.partner_terms.agreement"
            twClassName="text-center"
            testID={VbaPartnerTermsSelectorsIDs.AGREEMENT}
            links={{
              termsAndConditions: {
                ...toSentenceLink(
                  strings('virtual_bank_account.partner_terms.agreement_terms'),
                  findDisclaimerByKeyword(idos, 'terms'),
                  VbaPartnerTermsSelectorsIDs.AGREEMENT_TERMS_LINK,
                ),
                color: TextColor.PrimaryDefault,
              },
            }}
          />
          <CrossfadeButton
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!hasBiometricConsent}
            onPress={handleAgree}
            label={ctaLabel}
            testID={VbaPartnerTermsSelectorsIDs.AGREE_BUTTON}
          />
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default VbaPartnerTerms;
