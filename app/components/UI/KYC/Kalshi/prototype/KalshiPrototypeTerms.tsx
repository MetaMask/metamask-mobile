// PROTOTYPE-DO-NOT-MERGE
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Linking,
  ScrollView,
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
  TextButton,
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { KycDisclaimer } from '@metamask/kyc-controller';
import { strings } from '../../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../../selectors/featureFlagController/glassHeaders';
import CrossfadeButton from '../../Views/SumSub/CrossfadeButton';
import { getKalshiPrototypeKycService } from './prototypeRuntime';
import {
  PROTOTYPE_COPY,
  PROTOTYPE_KALSHI_PRIVACY_POLICY_URL,
  PROTOTYPE_SOCURE_LINKS,
} from './prototypeConstants';
import { KalshiPrototypeTermsSelectorsIDs } from './KalshiPrototypeTerms.testIds';
import KalshiPrototypeLoading from './KalshiPrototypeLoading';

/** This page's place in the flow ("Step 3 of 3"). */
const STEP = { current: 3, total: 3 };

/**
 * How much of the consent row must be on screen to count as seen, as on the
 * UKYC partners page: the checkbox plus a little room.
 */
const CHECKBOX_VISIBLE_HEIGHT = 24;

const copy = PROTOTYPE_COPY.kalshiTerms;

const openUrl = (url: string) => Linking.openURL(url);

/** A Kalshi document row, as the UKYC partners page lists its documents. */
const DocumentRow = ({ disclaimer }: { disclaimer: KycDisclaimer }) => {
  const openLink = useCallback(() => openUrl(disclaimer.url), [disclaimer.url]);

  return (
    <ListItem
      isInteractive
      variant={ContentVariant.OneLine}
      title={disclaimer.display_name}
      endAccessory={
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      }
      onPress={openLink}
      accessibilityRole="link"
      testID={`${KalshiPrototypeTermsSelectorsIDs.DOCUMENT_LINK}-${disclaimer.id}`}
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

/** An inline link inside a sentence, styled the way `SentenceWithLinks` does. */
const InlineLink = ({
  label,
  url,
  variant,
  color,
  testID,
}: {
  label: string;
  url: string;
  variant: TextVariant;
  color?: TextColor;
  testID: string;
}) => {
  const tw = useTailwind();
  return (
    <TextButton
      variant={variant}
      style={color ? { color: tw.color(color) } : undefined}
      onPress={() => openUrl(url)}
      accessibilityRole="link"
      testID={testID}
    >
      {label}
    </TextButton>
  );
};

interface KalshiPrototypeVendorTermsProps {
  /**
   * The page's terms were accepted: records them, opens the session and
   * moves the flow on. Answers `true` when the acceptance recorded.
   */
  onAccepted: () => Promise<boolean> | boolean;
  /** Pops the stack. */
  onBack: () => void;
  /**
   * A returning UKYC user, who skipped steps 1 and 2: no step count, the
   * catch-up title and body, and MetaMask's Kalshi sharing consent, which
   * must be ticked too.
   */
  isCatchUp?: boolean;
}

/**
 * The Kalshi terms page from the Paper design (Kalshi Logic 9DM / 9FA): the
 * five Kalshi documents and the Socure blurb in one card, the Socure
 * biometric consent, and a sticky footer whose button stays off until the
 * consent is ticked. Built from the same pieces as the UKYC partners page
 * (`PartnerTerms`), which it mirrors in layout and spacing.
 *
 * @param props - The Kalshi documents and the handlers.
 * @returns The page.
 */
const KalshiPrototypeVendorTermsPage = ({
  vendorDisclaimers,
  onAccepted,
  onBack,
  isCatchUp = false,
}: KalshiPrototypeVendorTermsProps & {
  vendorDisclaimers: KycDisclaimer[];
}) => {
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const [hasSocureConsent, setHasSocureConsent] = useState(false);
  const [hasSharingConsent, setHasSharingConsent] = useState(false);
  const sharingCheckboxRef = useRef<{ toggle: () => void }>(null);
  const hasAllConsents = hasSocureConsent && (!isCatchUp || hasSharingConsent);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const checkboxRef = useRef<{ toggle: () => void }>(null);
  const [consentRowY, setConsentRowY] = useState<number>();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const privacyPolicyUrl =
    vendorDisclaimers.find(
      (disclaimer) => disclaimer.id === 'kalshi-privacy-policy',
    )?.url ?? PROTOTYPE_KALSHI_PRIVACY_POLICY_URL;

  const toggleSocureConsent = useCallback(
    () => checkboxRef.current?.toggle(),
    [],
  );

  const toggleSharingConsent = useCallback(
    () => sharingCheckboxRef.current?.toggle(),
    [],
  );

  const handleAgree = useCallback(async () => {
    if (isAdvancing) {
      return;
    }
    setIsAdvancing(true);
    try {
      await onAccepted();
    } finally {
      // The screen stays in the stack under the next one, so it must not
      // stay busy when back returns to it.
      setIsAdvancing(false);
    }
  }, [isAdvancing, onAccepted]);

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

  let ctaLabel: string = copy.scrollToContinue;
  if (hasAllConsents) {
    ctaLabel = copy.agreeAndContinue;
  } else if (isConsentRowInView) {
    ctaLabel = copy.agreeToConsentAbove;
  }

  const stepIndicator = (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      accessibilityLabel={strings(
        'wallet.home_onboarding_steps.progress_a11y',
        STEP,
      )}
      testID={KalshiPrototypeTermsSelectorsIDs.STEP_INDICATOR}
    >
      {copy.stepIndicator}
    </Text>
  );

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={KalshiPrototypeTermsSelectorsIDs.VENDOR_PAGE}
    >
      <SafeAreaView
        edges={['right', 'bottom', 'left']}
        style={tw.style('flex-1')}
      >
        <HeaderStandardGlass
          isGlass={isGlassHeader}
          isFloating={false}
          onBack={onBack}
          title={isCatchUp ? undefined : stepIndicator}
          backButtonProps={{
            testID: KalshiPrototypeTermsSelectorsIDs.BACK_BUTTON,
          }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow pb-4')}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onLayout={handleViewportLayout}
          testID={KalshiPrototypeTermsSelectorsIDs.CONTAINER}
        >
          <TitleStandard
            title={isCatchUp ? copy.catchUp.title : copy.title}
            bottomLabel={isCatchUp ? copy.catchUp.body : copy.body}
            twClassName="px-4 pt-2 pb-4"
          />

          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            twClassName="px-4 pb-2 pt-2"
          >
            {copy.sectionTitle}
          </Text>

          <Box twClassName="mx-4 overflow-hidden rounded-xl bg-muted">
            <GroupTitle title={copy.kalshiGroupTitle} />
            {vendorDisclaimers.map((disclaimer) => (
              <DocumentRow key={disclaimer.id} disclaimer={disclaimer} />
            ))}

            <Box twClassName="h-px bg-muted" />

            <GroupTitle title={copy.socureGroupTitle} />
            <Box twClassName="px-4 pb-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={KalshiPrototypeTermsSelectorsIDs.SOCURE_BODY}
              >
                {copy.socureBody}
              </Text>
            </Box>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Start}
            twClassName="mx-4 mt-4 gap-3"
            onLayout={isCatchUp ? undefined : handleConsentRowLayout}
            testID={KalshiPrototypeTermsSelectorsIDs.CONSENT_ROW}
          >
            <Checkbox
              ref={checkboxRef}
              isSelected={hasSocureConsent}
              onChange={setHasSocureConsent}
              testID={KalshiPrototypeTermsSelectorsIDs.CONSENT_CHECKBOX}
            />
            <Box twClassName="flex-1">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                onPress={toggleSocureConsent}
                suppressHighlighting
              >
                {copy.socureConsent.beforeTerms}
                <InlineLink
                  label={copy.socureConsent.termsOfUse}
                  url={PROTOTYPE_SOCURE_LINKS.termsOfUse}
                  variant={TextVariant.BodyMd}
                  testID={KalshiPrototypeTermsSelectorsIDs.CONSENT_TERMS_LINK}
                />
                {copy.socureConsent.between}
                <InlineLink
                  label={copy.socureConsent.privacyNotice}
                  url={PROTOTYPE_SOCURE_LINKS.privacyNotice}
                  variant={TextVariant.BodyMd}
                  testID={KalshiPrototypeTermsSelectorsIDs.CONSENT_PRIVACY_LINK}
                />
                {copy.socureConsent.after}
              </Text>
            </Box>
          </Box>

          {isCatchUp ? (
            <>
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Bold}
                twClassName="px-4 pb-2 pt-6"
              >
                {copy.catchUp.metamaskGroupTitle}
              </Text>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Start}
                twClassName="mx-4 gap-3"
                onLayout={handleConsentRowLayout}
              >
                <Checkbox
                  ref={sharingCheckboxRef}
                  isSelected={hasSharingConsent}
                  onChange={setHasSharingConsent}
                  testID={
                    KalshiPrototypeTermsSelectorsIDs.SHARING_CONSENT_CHECKBOX
                  }
                />
                <Box twClassName="flex-1">
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextDefault}
                    onPress={toggleSharingConsent}
                    suppressHighlighting
                  >
                    {copy.catchUp.sharingConsent}
                  </Text>
                </Box>
              </Box>
            </>
          ) : null}
        </ScrollView>

        <Box twClassName="gap-4 border-t border-muted px-4 pb-2 pt-4">
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextAlternative}
            twClassName="text-center"
            testID={KalshiPrototypeTermsSelectorsIDs.AGREEMENT}
          >
            {copy.agreement.before}
            <InlineLink
              label={copy.agreement.privacyPolicy}
              url={privacyPolicyUrl}
              variant={TextVariant.BodyXs}
              color={TextColor.PrimaryDefault}
              testID={KalshiPrototypeTermsSelectorsIDs.AGREEMENT_PRIVACY_LINK}
            />
            {copy.agreement.after}
          </Text>
          <CrossfadeButton
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!hasAllConsents}
            isLoading={isAdvancing}
            onPress={handleAgree}
            label={ctaLabel}
            testID={KalshiPrototypeTermsSelectorsIDs.AGREE_BUTTON}
          />
        </Box>
      </SafeAreaView>
    </Box>
  );
};

/**
 * Loads the Kalshi documents the page links from the fake, holding the
 * shared fox loader until they land: the design withholds the footer and
 * keeps the button off until the documents load.
 *
 * @param props - The acceptance and back handlers.
 * @returns The page, or the loader.
 */
const KalshiPrototypeVendorTerms = (props: KalshiPrototypeVendorTermsProps) => {
  const [vendorDisclaimers, setVendorDisclaimers] = useState<KycDisclaimer[]>();

  useEffect(() => {
    let active = true;
    // The fake service resolves at once; the loader keeps the walkthrough's
    // shape honest for the real flow's wait.
    (async () => {
      const service = getKalshiPrototypeKycService();
      const country = await service.getGeoCountry();
      const disclaimers = await service.fetchVendorDisclaimers({
        vendor: 'kalshi',
        country,
      });
      if (active) {
        setVendorDisclaimers(disclaimers);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (!vendorDisclaimers) {
    return <KalshiPrototypeLoading />;
  }
  return (
    <KalshiPrototypeVendorTermsPage
      {...props}
      vendorDisclaimers={vendorDisclaimers}
    />
  );
};

export default KalshiPrototypeVendorTerms;
