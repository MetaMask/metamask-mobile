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
  KYC_SESSION_DISCLAIMER_DISPLAY,
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
}

/**
 * "Data and privacy" confirm sheet over Verify your identity. idOS needs an
 * explicit, separate biometric consent before any data is collected, so Agree
 * stays disabled until the consent checkbox is ticked. Agreeing closes the sheet,
 * then hands off to the provider step, which records the session consents and
 * launches SumSub back-to-back.
 */
const VbaProviderTermsSheet = ({
  disclaimers,
  onAgree,
  onClose,
}: VbaProviderTermsSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);
  const [hasBiometricConsent, setHasBiometricConsent] = useState(false);

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
        </Box>
        <Box twClassName="px-4">
          <Checkbox
            isSelected={hasBiometricConsent}
            onChange={setHasBiometricConsent}
            accessibilityLabel={`${strings(
              'virtual_bank_account.verify_identity.biometric_consent_label',
            )}${strings(
              'virtual_bank_account.verify_identity.biometric_consent_link',
            )}${strings(
              'virtual_bank_account.verify_identity.biometric_consent_label_end',
            )}`}
            testID={VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_CHECKBOX}
            label={
              <Box twClassName="ml-3 flex-1">
                <Text variant={TextVariant.BodyMd}>
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
                </Text>
              </Box>
            }
          />
        </Box>
      </Box>
      <BottomSheetFooter
        twClassName="pb-2"
        primaryButtonProps={{
          children: strings(
            'virtual_bank_account.verify_identity.terms_sheet_button',
          ),
          size: ButtonSize.Lg,
          isDisabled: !hasBiometricConsent,
          onPress: handleAgree,
          testID: VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default VbaProviderTermsSheet;
