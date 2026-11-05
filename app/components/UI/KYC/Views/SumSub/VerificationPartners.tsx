import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonSize,
  Checkbox,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import {
  IDOS_PRIVACY_NOTICE_URL,
  IDOS_TERMS_URL,
  KYC_SESSION_DISCLAIMER_DISPLAY,
  SUMSUB_BIOMETRICS_CONSENT_URL,
  SUMSUB_PERSONAL_DATA_PROCESSING_URL,
  SUMSUB_PRIVACY_NOTICE_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import {
  useKycSessionDisclaimers,
  type KycCatalogDisclaimerLink,
} from '../../hooks/useKycSessionDisclaimers';
import { trackIdentityTerms } from '../../utils/trackIdentityTerms';
import { openExternalUrl } from '../../utils/openExternalUrl';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_CONTENT_STATE,
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
  type KycScreenContentState,
} from '../../kycScreenPerformance';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import { VbaVerificationPartnersSelectorsIDs } from './VerifyIdentity.testIds';
import { useBiometricConsent } from './BiometricConsentContext';
import CrossfadeButton from './CrossfadeButton';
import {
  InlineLink,
  TermsCard,
  TermsLinkRow,
  TermsParty,
  TermsSectionTitle,
  TermsStepCounter,
} from './IdentityTermsComponents';

const verifyIdentityString = (key: string) =>
  strings(`virtual_bank_account.verify_identity.${key}`);

const IDOS_TERMS_DISCLAIMER_ID = 'idOS:end_user_agreement';

/** Screen reader action on the consent checkbox that opens its inline link. */
const OPEN_PRIVACY_NOTICE_ACTION = 'openPrivacyNotice';

/**
 * How much of the consent row must be on screen to count as seen: the
 * checkbox itself plus a little room, so the footer switches to Agree once the
 * tick target is visible rather than only when the whole sentence is.
 */
const CHECKBOX_VISIBLE_HEIGHT = 24;

interface TermsLink {
  id: string;
  title: string;
  url: string;
  testID: string;
}

const toTermsLink = (
  disclaimer: KycCatalogDisclaimerLink,
  title: string,
): TermsLink => ({
  id: disclaimer.id,
  title,
  url: disclaimer.url,
  testID: `${VbaVerificationPartnersSelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`,
});

/**
 * Picks the documents legal asked for, in their order and with their labels.
 * Falls back to the full catalog with backend titles if none match, so the
 * screen is never empty when the catalog changes shape. The idOS Terms and
 * Conditions are left out of both: the footer line already links them.
 */
const getDisplayedLinks = (
  disclaimers: KycCatalogDisclaimerLink[],
): TermsLink[] => {
  const cardDisclaimers = disclaimers.filter(
    (item) => item.id !== IDOS_TERMS_DISCLAIMER_ID,
  );
  const displayed = KYC_SESSION_DISCLAIMER_DISPLAY.flatMap((entry) => {
    const disclaimer = cardDisclaimers.find(
      (item) => item.id === `${entry.group}:${entry.key}`,
    );
    return disclaimer ? [toTermsLink(disclaimer, strings(entry.titleKey))] : [];
  });

  return displayed.length
    ? displayed
    : cardDisclaimers.map((disclaimer) =>
        toTermsLink(disclaimer, disclaimer.title),
      );
};

interface VbaVerificationPartnersProps {
  /** Returns to Verify your identity (screen 1 of 2). */
  onBack: () => void;
  /** Starts Sumsub. Called only after the biometric consent is ticked. */
  onAgree: () => void | Promise<void>;
}

/**
 * Screen 2 of 2 of the identity terms: idOS and Sumsub. idOS needs an explicit,
 * separate biometric consent before any data is collected. The footer CTA
 * stays disabled until the consent checkbox is ticked (and the session terms
 * have loaded); its label reads Scroll to continue while the consent is below
 * the fold, Agree to consent above once it's in view, and Agree and continue
 * once it's ticked. Agreeing hands off to the provider step, which records the session
 * consents and launches Sumsub back-to-back. The tick lives in
 * {@link useBiometricConsent}, so it survives Back to screen 1.
 */
const VbaVerificationPartners = ({
  onBack,
  onAgree,
}: VbaVerificationPartnersProps) => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const tw = useTailwind();
  const { disclaimers, isLoading, error, retry } = useKycSessionDisclaimers();
  const [hasBiometricConsent, setHasBiometricConsent] = useBiometricConsent();

  // Where the consent row sits in the scroll content, and what's on screen.
  // Until both are measured the row counts as off screen.
  const [consentRow, setConsentRow] = useState<{
    y: number;
    height: number;
    // Measured while the terms were still loading, so the row sat higher than
    // it will once the card fills in.
    isProvisional: boolean;
  }>();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const handleViewportLayout = useCallback(
    (event: LayoutChangeEvent) =>
      setViewportHeight(event.nativeEvent.layout.height),
    [],
  );
  const handleConsentRowLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      setConsentRow({ y, height, isProvisional: isLoading });
    },
    [isLoading],
  );
  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) =>
      setScrollOffset(event.nativeEvent.contentOffset.y),
    [],
  );

  // Only a measurement taken after the terms load counts: while the card is
  // still empty the row sits high up and would read as in view too early.
  const isConsentRowInView =
    consentRow !== undefined &&
    !consentRow.isProvisional &&
    viewportHeight > 0 &&
    consentRow.y + CHECKBOX_VISIBLE_HEIGHT <= scrollOffset + viewportHeight;

  // The footer CTA tells the user what's left: scroll to the consent, tick
  // it, then agree. It's only enabled once the consent is ticked.
  let ctaLabel = verifyIdentityString('partners_scroll_to_continue');
  if (hasBiometricConsent) {
    ctaLabel = verifyIdentityString('partners_agree_and_continue');
  } else if (isConsentRowInView) {
    ctaLabel = verifyIdentityString('partners_agree_to_consent_above');
  }

  let contentState: KycScreenContentState = KYC_SCREEN_CONTENT_STATE.EMPTY;
  if (error) {
    contentState = KYC_SCREEN_CONTENT_STATE.ERROR;
  } else if (disclaimers?.length) {
    contentState = KYC_SCREEN_CONTENT_STATE.POPULATED;
  }

  useScreenPerformance({
    config: KYC_SCREEN_PERFORMANCE_CONFIG,
    screenId: KYC_SCREEN_ID.PROVIDER_TERMS_MODAL,
    contentReady: !isLoading,
    contentState,
  });

  // Fires when the session terms fail to load, not on each render.
  useEffect(() => {
    if (error) {
      trackIdentityTerms('failed');
    }
  }, [error]);

  // Agree can't record consent without the idOS / Sumsub terms the user saw.
  const hasTerms = !isLoading && !error && Boolean(disclaimers?.length);

  const links = useMemo(
    () => (disclaimers ? getDisplayedLinks(disclaimers) : []),
    [disclaimers],
  );
  const idosTermsUrl =
    disclaimers?.find((item) => item.id === IDOS_TERMS_DISCLAIMER_ID)?.url ??
    IDOS_TERMS_URL;

  const consentSentence = [
    'biometric_consent_label',
    'biometric_consent_link',
    'biometric_consent_label_end',
  ]
    .map(verifyIdentityString)
    .join('');

  // The sentence beside the checkbox toggles it too, through the Checkbox's
  // own toggle so it gets the same bounce. Its nested link handles its own
  // press, so tapping the link never reaches this.
  const checkboxRef = useRef<{ toggle: () => void }>(null);
  const toggleBiometricConsent = useCallback(
    () => checkboxRef.current?.toggle(),
    [],
  );
  const privacyNoticeActionLabel = `${verifyIdentityString(
    'biometric_consent_link',
  )}, ${verifyIdentityString('opens_in_browser_hint')}`;
  const handleConsentAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === OPEN_PRIVACY_NOTICE_ACTION) {
        openExternalUrl(IDOS_PRIVACY_NOTICE_URL);
      }
    },
    [],
  );

  const handleAgree = useCallback(async () => {
    trackIdentityTerms('accepted');
    await onAgree();
  }, [onAgree]);

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
            accessibilityLabel: strings('navigation.back'),
            testID: VbaVerificationPartnersSelectorsIDs.BACK_BUTTON,
          }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow pb-6')}
          onLayout={handleViewportLayout}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          testID={VbaVerificationPartnersSelectorsIDs.CONTAINER}
        >
          <TitleStandard
            topAccessory={
              <TermsStepCounter
                step={2}
                testID={VbaVerificationPartnersSelectorsIDs.STEP_COUNTER}
              />
            }
            title={verifyIdentityString('partners_title')}
            bottomLabel={verifyIdentityString('partners_description')}
            twClassName="px-4"
          />

          <TermsSectionTitle>
            {verifyIdentityString('terms_section_title')}
          </TermsSectionTitle>
          <TermsCard>
            <TermsParty name={verifyIdentityString('party_idos')}>
              {links.map((link) => (
                <TermsLinkRow
                  key={link.id}
                  title={link.title}
                  url={link.url}
                  testID={link.testID}
                />
              ))}
            </TermsParty>
            <TermsParty name={verifyIdentityString('party_sumsub')} hasDivider>
              <Box
                twClassName="px-4 pb-2 pt-1"
                testID={
                  VbaVerificationPartnersSelectorsIDs.SUMSUB_ACKNOWLEDGEMENT
                }
              >
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {verifyIdentityString('sumsub_acknowledgement_start')}
                  <InlineLink
                    url={SUMSUB_PERSONAL_DATA_PROCESSING_URL}
                    variant={TextVariant.BodySm}
                    testID={
                      VbaVerificationPartnersSelectorsIDs.SUMSUB_PERSONAL_DATA_PROCESSING_LINK
                    }
                  >
                    {verifyIdentityString(
                      'sumsub_acknowledgement_data_processing_link',
                    )}
                  </InlineLink>
                  {verifyIdentityString('sumsub_acknowledgement_us_residents')}
                  <InlineLink
                    url={SUMSUB_PRIVACY_NOTICE_URL}
                    variant={TextVariant.BodySm}
                    testID={
                      VbaVerificationPartnersSelectorsIDs.SUMSUB_PRIVACY_NOTICE_LINK
                    }
                  >
                    {verifyIdentityString(
                      'sumsub_acknowledgement_privacy_notice_link',
                    )}
                  </InlineLink>
                  {verifyIdentityString(
                    'sumsub_acknowledgement_biometric_consent',
                  )}
                  <InlineLink
                    url={SUMSUB_BIOMETRICS_CONSENT_URL}
                    variant={TextVariant.BodySm}
                    testID={
                      VbaVerificationPartnersSelectorsIDs.SUMSUB_BIOMETRICS_CONSENT_LINK
                    }
                  >
                    {verifyIdentityString(
                      'sumsub_acknowledgement_biometrics_consent_link',
                    )}
                  </InlineLink>
                </Text>
              </Box>
            </TermsParty>
          </TermsCard>

          {/* The MMDS Checkbox is only the tick control. The sentence beside
              it is a separate Text so the idOS Privacy Notice link can sit
              inline: tapping the words toggles the box, and the nested link's
              own press wins, so the link only opens the notice. Screen
              readers get one checkbox labelled with the whole sentence, with
              the link as a custom action on it, so the sentence itself is
              hidden from them. */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Start}
            twClassName="mx-4 mt-6"
            onLayout={handleConsentRowLayout}
            testID={VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_ROW}
          >
            <Checkbox
              ref={checkboxRef}
              isSelected={hasBiometricConsent}
              onChange={setHasBiometricConsent}
              accessibilityLabel={consentSentence}
              accessibilityActions={[
                {
                  name: OPEN_PRIVACY_NOTICE_ACTION,
                  label: privacyNoticeActionLabel,
                },
              ]}
              onAccessibilityAction={handleConsentAccessibilityAction}
              testID={
                VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX
              }
              // Centres the 22px box on the sentence's 24px first line.
              twClassName="mt-px"
            />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="ml-3 flex-1"
              onPress={toggleBiometricConsent}
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              testID={
                VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LABEL
              }
            >
              {verifyIdentityString('biometric_consent_label')}
              <InlineLink
                url={IDOS_PRIVACY_NOTICE_URL}
                testID={
                  VbaVerificationPartnersSelectorsIDs.BIOMETRIC_CONSENT_LINK
                }
              >
                {verifyIdentityString('biometric_consent_link')}
              </InlineLink>
              {verifyIdentityString('biometric_consent_label_end')}
            </Text>
          </Box>
        </ScrollView>

        {/* Sticky footer: a top border separates it from the scrolling
            content, as on other full-screen flows with a fixed CTA. */}
        <Box twClassName="gap-4 border-t border-muted bg-default px-4 pb-2 pt-4">
          {error ? (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Start}
              justifyContent={BoxJustifyContent.Center}
              twClassName="gap-2"
              testID={VbaVerificationPartnersSelectorsIDs.DISCLAIMERS_ERROR}
            >
              <Box twClassName="shrink-0 pt-0.5">
                <Icon
                  name={IconName.Danger}
                  size={IconSize.Sm}
                  color={IconColor.ErrorDefault}
                />
              </Box>
              <Text variant={TextVariant.BodySm} color={TextColor.ErrorDefault}>
                {verifyIdentityString('disclaimers_error')}{' '}
                <TextButton
                  variant={TextVariant.BodySm}
                  onPress={retry}
                  testID={VbaVerificationPartnersSelectorsIDs.DISCLAIMERS_RETRY}
                >
                  {verifyIdentityString('disclaimers_retry')}
                </TextButton>
              </Text>
            </Box>
          ) : null}
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={VbaVerificationPartnersSelectorsIDs.IDOS_AGREEMENT}
          >
            {verifyIdentityString('partners_footer_agreement_idos_start')}
            <InlineLink
              url={idosTermsUrl}
              variant={TextVariant.BodySm}
              testID={VbaVerificationPartnersSelectorsIDs.IDOS_TERMS_LINK}
            >
              {verifyIdentityString('terms_link_idos_terms')}
            </InlineLink>
            {verifyIdentityString('footer_agreement_idos_end')}
          </Text>
          <CrossfadeButton
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!hasBiometricConsent || !hasTerms}
            isLoading={isLoading}
            onPress={handleAgree}
            label={ctaLabel}
            testID={VbaVerificationPartnersSelectorsIDs.AGREE_BUTTON}
          />
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default VbaVerificationPartners;
