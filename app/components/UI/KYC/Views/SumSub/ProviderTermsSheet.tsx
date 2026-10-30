import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  ButtonSize,
  Checkbox,
  ContentVariant,
  FontWeight,
  Icon,
  IconName,
  ListItem,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { openExternalUrl } from '../../utils/openExternalUrl';
import { strings } from '../../../../../../locales/i18n';
import {
  IDOS_PRIVACY_NOTICE_URL,
  KYC_CONSENT_VENDOR,
  KYC_SESSION_DISCLAIMER_DISPLAY,
  SOCURE_BIOMETRIC_PROCESSING_AGREEMENT_URL,
  SOCURE_PRIVACY_NOTICE_URL,
  SOCURE_TERMS_OF_USE_URL,
  type KycConsentVendor,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  KYC_SCREEN_ID,
  KYC_SCREEN_PERFORMANCE_CONFIG,
} from '../../kycScreenPerformance';

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
  testID: `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`,
});

/**
 * Picks the documents legal asked for, in their order and with their labels.
 * Falls back to the full catalog with backend titles if none match, so the
 * sheet is never empty when the catalog changes shape.
 */
const getDisplayedLinks = (
  disclaimers: KycCatalogDisclaimerLink[],
): TermsLink[] => {
  const displayed = KYC_SESSION_DISCLAIMER_DISPLAY.flatMap((entry) => {
    const disclaimer = disclaimers.find(
      (item) => item.id === `${entry.group}:${entry.key}`,
    );
    return disclaimer ? [toTermsLink(disclaimer, strings(entry.titleKey))] : [];
  });

  return displayed.length
    ? displayed
    : disclaimers.map((disclaimer) =>
        toTermsLink(disclaimer, disclaimer.title),
      );
};

const SOCURE_DOCUMENTS_ROW_ID = 'socure:terms_and_privacy';

const ConsentLink = ({
  label,
  url,
  testID,
  accessibilityHint,
}: {
  label: string;
  url: string;
  testID: string;
  accessibilityHint?: string;
}) => {
  const handlePress = useCallback(
    (event?: GestureResponderEvent) => {
      event?.stopPropagation?.();
      openExternalUrl(url);
    },
    [url],
  );

  return (
    <TextButton
      variant={TextVariant.BodyMd}
      onPress={handlePress}
      accessibilityRole="link"
      accessibilityHint={accessibilityHint}
      testID={testID}
    >
      {label}
    </TextButton>
  );
};

const SocureDocumentsRow = () => (
  <ListItem
    variant={ContentVariant.OneLine}
    title={
      <Text
        variant={TextVariant.BodyMd}
        fontWeight={FontWeight.Medium}
        color={TextColor.TextDefault}
      >
        {strings(
          'virtual_bank_account.verify_identity.terms_link_socure_prefix',
        )}
        <ConsentLink
          label={strings(
            'virtual_bank_account.verify_identity.terms_link_socure_terms',
          )}
          url={SOCURE_TERMS_OF_USE_URL}
          testID={VbaVerifyIdentitySelectorsIDs.SOCURE_TERMS_OF_USE_LINK}
          accessibilityHint={strings(
            'virtual_bank_account.verify_identity.opens_in_browser_hint',
          )}
        />
        {strings('virtual_bank_account.verify_identity.terms_link_socure_and')}
        <ConsentLink
          label={strings(
            'virtual_bank_account.verify_identity.terms_link_socure_privacy',
          )}
          url={SOCURE_PRIVACY_NOTICE_URL}
          testID={VbaVerifyIdentitySelectorsIDs.SOCURE_PRIVACY_NOTICE_LINK}
          accessibilityHint={strings(
            'virtual_bank_account.verify_identity.opens_in_browser_hint',
          )}
        />
      </Text>
    }
    endAccessory={<Icon name={IconName.Arrow2UpRight} />}
    testID={`${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-${SOCURE_DOCUMENTS_ROW_ID}`}
  />
);

const TermsLinkRow = ({ link }: { link: TermsLink }) => {
  const openLink = useCallback(() => openExternalUrl(link.url), [link.url]);

  return (
    <ListItem
      isInteractive
      variant={ContentVariant.OneLine}
      title={link.title}
      endAccessory={<Icon name={IconName.Arrow2UpRight} />}
      onPress={openLink}
      accessibilityRole="link"
      accessibilityHint={strings(
        'virtual_bank_account.verify_identity.opens_in_browser_hint',
      )}
      testID={link.testID}
    />
  );
};

interface VbaProviderTermsSheetProps {
  /** idOS and SumSub documents from `useKycSessionDisclaimers`. */
  disclaimers: KycCatalogDisclaimerLink[];
  onAgree: () => void;
  onClose: () => void;
  /**
   * Consent sheet variant. Defaults to VBA so the idOS-only checkbox and the
   * four catalog documents stay as they are.
   */
  vendor?: KycConsentVendor;
}

/**
 * "Data and privacy" confirm sheet over Verify your identity. idOS needs an
 * explicit, separate biometric consent before any data is collected, so Agree
 * stays disabled until the consent checkbox is ticked. The Kalshi variant adds
 * Socure's documents, replaces that label with a merged idOS and Socure
 * consent, and requires a separate Biometric Processing Agreement consent.
 * Agreeing closes the sheet, then hands off to the provider step, which
 * records the session consents and launches SumSub back-to-back.
 */
const VbaProviderTermsSheet = ({
  disclaimers,
  onAgree,
  onClose,
  vendor = KYC_CONSENT_VENDOR.VBA,
}: VbaProviderTermsSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const isKalshi = vendor === KYC_CONSENT_VENDOR.KALSHI;
  const [hasBiometricConsent, setHasBiometricConsent] = useState(false);
  const [hasBpaConsent, setHasBpaConsent] = useState(false);

  // Stop the press reaching the Checkbox so opening the notice doesn't tick it.
  const openIdosPrivacyNotice = useCallback((event?: GestureResponderEvent) => {
    event?.stopPropagation?.();
    openExternalUrl(IDOS_PRIVACY_NOTICE_URL);
  }, []);

  useScreenPerformance({
    config: KYC_SCREEN_PERFORMANCE_CONFIG,
    screenId: KYC_SCREEN_ID.PROVIDER_TERMS_MODAL,
    contentReady: true,
  });

  const handleAgree = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onAgree);
  }, [onAgree]);

  const links = useMemo(() => getDisplayedLinks(disclaimers), [disclaimers]);

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      keyboardAvoidingViewEnabled={false}
      testID={VbaVerifyIdentitySelectorsIDs.TERMS_SHEET}
    >
      <Box twClassName="gap-2.5 py-6">
        <Box twClassName="gap-2 p-4">
          <Text variant={TextVariant.HeadingLg}>
            {strings('virtual_bank_account.verify_identity.terms_sheet_title')}
          </Text>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Regular}
            color={TextColor.TextAlternative}
          >
            {strings(
              'virtual_bank_account.verify_identity.terms_sheet_description',
            )}
          </Text>
        </Box>
        <Box>
          {links.map((link) => (
            <TermsLinkRow key={link.id} link={link} />
          ))}
          {isKalshi ? <SocureDocumentsRow /> : null}
        </Box>
        <Box twClassName={isKalshi ? 'gap-4 px-4' : 'px-4'}>
          <Checkbox
            isSelected={hasBiometricConsent}
            onChange={setHasBiometricConsent}
            accessibilityLabel={
              isKalshi
                ? `${strings(
                    'virtual_bank_account.verify_identity.kalshi_biometric_consent_label_start',
                  )}${strings(
                    'virtual_bank_account.verify_identity.biometric_consent_link',
                  )}${strings(
                    'virtual_bank_account.verify_identity.kalshi_biometric_consent_label_middle',
                  )}${strings(
                    'virtual_bank_account.verify_identity.kalshi_biometric_consent_socure_terms_link',
                  )}${strings(
                    'virtual_bank_account.verify_identity.kalshi_biometric_consent_label_and',
                  )}${strings(
                    'virtual_bank_account.verify_identity.kalshi_biometric_consent_socure_privacy_link',
                  )}${strings(
                    'virtual_bank_account.verify_identity.kalshi_biometric_consent_label_end',
                  )}`
                : `${strings(
                    'virtual_bank_account.verify_identity.biometric_consent_label',
                  )}${strings(
                    'virtual_bank_account.verify_identity.biometric_consent_link',
                  )}${strings(
                    'virtual_bank_account.verify_identity.biometric_consent_label_end',
                  )}`
            }
            testID={VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX}
            label={
              <Box twClassName="ml-3 flex-1">
                <Text variant={TextVariant.BodyMd}>
                  {isKalshi ? (
                    <>
                      {strings(
                        'virtual_bank_account.verify_identity.kalshi_biometric_consent_label_start',
                      )}
                      <ConsentLink
                        label={strings(
                          'virtual_bank_account.verify_identity.biometric_consent_link',
                        )}
                        url={IDOS_PRIVACY_NOTICE_URL}
                        testID={
                          VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_LINK
                        }
                      />
                      {strings(
                        'virtual_bank_account.verify_identity.kalshi_biometric_consent_label_middle',
                      )}
                      <ConsentLink
                        label={strings(
                          'virtual_bank_account.verify_identity.kalshi_biometric_consent_socure_terms_link',
                        )}
                        url={SOCURE_TERMS_OF_USE_URL}
                        testID={
                          VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_SOCURE_TERMS_LINK
                        }
                      />
                      {strings(
                        'virtual_bank_account.verify_identity.kalshi_biometric_consent_label_and',
                      )}
                      <ConsentLink
                        label={strings(
                          'virtual_bank_account.verify_identity.kalshi_biometric_consent_socure_privacy_link',
                        )}
                        url={SOCURE_PRIVACY_NOTICE_URL}
                        testID={
                          VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_SOCURE_PRIVACY_LINK
                        }
                      />
                      {strings(
                        'virtual_bank_account.verify_identity.kalshi_biometric_consent_label_end',
                      )}
                    </>
                  ) : (
                    <>
                      {strings(
                        'virtual_bank_account.verify_identity.biometric_consent_label',
                      )}
                      <TextButton
                        variant={TextVariant.BodyMd}
                        onPress={openIdosPrivacyNotice}
                        accessibilityRole="link"
                        testID={
                          VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_LINK
                        }
                      >
                        {strings(
                          'virtual_bank_account.verify_identity.biometric_consent_link',
                        )}
                      </TextButton>
                      {strings(
                        'virtual_bank_account.verify_identity.biometric_consent_label_end',
                      )}
                    </>
                  )}
                </Text>
              </Box>
            }
          />
          {isKalshi ? (
            <Checkbox
              isSelected={hasBpaConsent}
              onChange={setHasBpaConsent}
              accessibilityLabel={`${strings(
                'virtual_bank_account.verify_identity.bpa_consent_label_start',
              )}${strings(
                'virtual_bank_account.verify_identity.bpa_consent_link',
              )}${strings(
                'virtual_bank_account.verify_identity.bpa_consent_label_end',
              )}`}
              testID={VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_CHECKBOX}
              label={
                <Box twClassName="ml-3 flex-1">
                  <Text variant={TextVariant.BodyMd}>
                    {strings(
                      'virtual_bank_account.verify_identity.bpa_consent_label_start',
                    )}
                    <ConsentLink
                      label={strings(
                        'virtual_bank_account.verify_identity.bpa_consent_link',
                      )}
                      url={SOCURE_BIOMETRIC_PROCESSING_AGREEMENT_URL}
                      testID={VbaVerifyIdentitySelectorsIDs.BPA_CONSENT_LINK}
                    />
                    {strings(
                      'virtual_bank_account.verify_identity.bpa_consent_label_end',
                    )}
                  </Text>
                </Box>
              }
            />
          ) : null}
        </Box>
      </Box>
      <BottomSheetFooter
        twClassName="pb-2"
        primaryButtonProps={{
          children: strings(
            'virtual_bank_account.verify_identity.terms_sheet_button',
          ),
          size: ButtonSize.Lg,
          isDisabled: !hasBiometricConsent || (isKalshi && !hasBpaConsent),
          onPress: handleAgree,
          testID: VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default VbaProviderTermsSheet;
