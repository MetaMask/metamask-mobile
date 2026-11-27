import React, { useCallback, useRef, useState } from 'react';
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
  TextColor,
  TextVariant,
  TitleStandard,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import HeaderStandardGlass from '../../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../../selectors/featureFlagController/glassHeaders';
import { fireImpact, ImpactMoment } from '../../../../util/haptics';
import {
  KALSHI_PRIVACY_POLICY_URL,
  SOCURE_PRIVACY_NOTICE_URL,
  SOCURE_TERMS_OF_USE_URL,
} from '../constants';
import SentenceWithLinks from '../components/SentenceWithLinks';
import CrossfadeButton from '../Views/SumSub/CrossfadeButton';
import { KalshiTermsSelectorsIDs } from './KalshiTerms.testIds';

/** This page's position in the consent flow. */
const PAGE_NUMBER = 3;

/** MetaMask, partners, then Kalshi. */
const DEFAULT_TOTAL_PAGES = 3;

/** Height of the consent row that must be visible to count as seen. */
const CHECKBOX_VISIBLE_HEIGHT = 24;

export interface KalshiTermsDocument {
  key: string;
  title: string;
  url: string;
}

const DocumentRow = ({
  legalDocument,
}: {
  legalDocument: KalshiTermsDocument;
}) => {
  const openLink = useCallback(
    () => Linking.openURL(legalDocument.url),
    [legalDocument.url],
  );

  return (
    <ListItem
      isInteractive
      variant={ContentVariant.OneLine}
      title={legalDocument.title}
      endAccessory={
        <Icon
          name={IconName.ArrowRight}
          size={IconSize.Md}
          color={IconColor.IconAlternative}
        />
      }
      onPress={openLink}
      accessibilityRole="link"
      testID={`${KalshiTermsSelectorsIDs.DOCUMENT_LINK}-${legalDocument.key}`}
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

interface KalshiTermsProps {
  /** Kalshi's documents for the user's country. */
  documents: KalshiTermsDocument[];
  /** Sends every acceptance in one call. */
  onAccept: () => void | Promise<unknown>;
  onBack: () => void;
  /** True while the acceptance is submitting. */
  isSubmitting?: boolean;
  /** Why the last acceptance failed. */
  error?: string;
  /** Total for the step indicator. */
  totalSteps?: number;
}

/**
 * Last Kalshi consent page: Kalshi's documents, the Socure biometric consent
 * and the footer agreement. The Socure checkbox only gates the button; it is
 * not recorded, because `submitTerms` has no field for it.
 */
const KalshiTerms = ({
  documents,
  onAccept,
  onBack,
  isSubmitting = false,
  error,
  totalSteps = DEFAULT_TOTAL_PAGES,
}: KalshiTermsProps) => {
  const tw = useTailwind();
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const [hasSocureConsent, setHasSocureConsent] = useState(false);
  const checkboxRef = useRef<{ toggle: () => void }>(null);
  const [consentRowY, setConsentRowY] = useState<number>();
  const [viewportHeight, setViewportHeight] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);

  const privacyPolicyUrl =
    documents.find(({ key }) => key.startsWith('kalshi-privacy-policy'))?.url ??
    KALSHI_PRIVACY_POLICY_URL;

  const toggleSocureConsent = useCallback(
    () => checkboxRef.current?.toggle(),
    [],
  );

  const handleAccept = useCallback(() => {
    fireImpact(ImpactMoment.PrimaryCTA);
    return onAccept();
  }, [onAccept]);

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

  let ctaLabel = strings('kyc.partner_terms.scroll_to_continue_button');
  if (hasSocureConsent) {
    ctaLabel = strings('kyc.partner_terms.button');
  } else if (isConsentRowInView) {
    ctaLabel = strings('kyc.partner_terms.agree_to_consent_above_button');
  }

  const stepIndicator = (
    <Text
      variant={TextVariant.BodySm}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
      accessibilityLabel={strings(
        'wallet.home_onboarding_steps.progress_a11y',
        {
          current: PAGE_NUMBER,
          total: totalSteps,
        },
      )}
      testID={KalshiTermsSelectorsIDs.STEP_INDICATOR}
    >
      {strings('kyc.verify_identity.step_indicator', {
        current: PAGE_NUMBER,
        total: totalSteps,
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
          title={stepIndicator}
          backButtonProps={{ testID: KalshiTermsSelectorsIDs.BACK_BUTTON }}
          includesTopInset
        />
        <ScrollView
          contentContainerStyle={tw.style('flex-grow pb-4')}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onLayout={handleViewportLayout}
          testID={KalshiTermsSelectorsIDs.CONTAINER}
        >
          <TitleStandard
            title={strings('kyc.kalshi_terms.title')}
            bottomLabel={strings('kyc.kalshi_terms.description')}
            twClassName="px-4 pt-2 pb-4"
          />

          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Bold}
            twClassName="px-4 pb-2 pt-2"
          >
            {strings('kyc.kalshi_terms.section_title')}
          </Text>

          <Box twClassName="mx-4 overflow-hidden rounded-xl bg-muted">
            <GroupTitle
              title={strings('kyc.kalshi_terms.kalshi_group_title')}
            />
            {documents.map((legalDocument) => (
              <DocumentRow
                key={legalDocument.key}
                legalDocument={legalDocument}
              />
            ))}

            <Box twClassName="h-px bg-muted" />

            <GroupTitle
              title={strings('kyc.kalshi_terms.socure_group_title')}
            />
            <Box twClassName="px-4 pb-4">
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={KalshiTermsSelectorsIDs.SOCURE_DESCRIPTION}
              >
                {strings('kyc.kalshi_terms.socure_description')}
              </Text>
            </Box>
          </Box>

          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Start}
            twClassName="mx-4 mt-4 gap-3"
            onLayout={handleConsentRowLayout}
            testID={KalshiTermsSelectorsIDs.SOCURE_CONSENT_ROW}
          >
            <Checkbox
              ref={checkboxRef}
              isSelected={hasSocureConsent}
              onChange={setHasSocureConsent}
              testID={KalshiTermsSelectorsIDs.SOCURE_CONSENT_CHECKBOX}
            />
            <Box twClassName="flex-1">
              <SentenceWithLinks
                i18nKey="kyc.kalshi_terms.socure_consent"
                variant={TextVariant.BodyMd}
                color={TextColor.TextDefault}
                onPress={toggleSocureConsent}
                suppressHighlighting
                testID={KalshiTermsSelectorsIDs.SOCURE_CONSENT}
                links={{
                  termsOfUse: {
                    label: strings('kyc.kalshi_terms.socure_terms_of_use'),
                    url: SOCURE_TERMS_OF_USE_URL,
                    testID: KalshiTermsSelectorsIDs.SOCURE_TERMS_LINK,
                  },
                  privacyNotice: {
                    label: strings('kyc.kalshi_terms.socure_privacy_notice'),
                    url: SOCURE_PRIVACY_NOTICE_URL,
                    testID: KalshiTermsSelectorsIDs.SOCURE_PRIVACY_LINK,
                  },
                }}
              />
            </Box>
          </Box>
        </ScrollView>

        <Box twClassName="gap-4 border-t border-muted px-4 pb-2 pt-4">
          {error ? (
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.ErrorDefault}
              twClassName="text-center"
              testID={KalshiTermsSelectorsIDs.ERROR}
            >
              {error}
            </Text>
          ) : null}
          <SentenceWithLinks
            i18nKey="kyc.kalshi_terms.agreement"
            twClassName="text-center"
            testID={KalshiTermsSelectorsIDs.AGREEMENT}
            links={{
              privacyPolicy: {
                label: strings('kyc.kalshi_terms.agreement_privacy_policy'),
                url: privacyPolicyUrl,
                testID: KalshiTermsSelectorsIDs.AGREEMENT_PRIVACY_LINK,
                color: TextColor.PrimaryDefault,
              },
            }}
          />
          <CrossfadeButton
            size={ButtonSize.Lg}
            isFullWidth
            isDisabled={!hasSocureConsent || isSubmitting}
            isLoading={isSubmitting}
            onPress={handleAccept}
            label={ctaLabel}
            testID={KalshiTermsSelectorsIDs.AGREE_BUTTON}
          />
        </Box>
      </SafeAreaView>
    </Box>
  );
};

export default KalshiTerms;
