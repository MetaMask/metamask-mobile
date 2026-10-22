import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Linking } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ButtonSize,
  ContentVariant,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  ListItem,
  Switch,
  Text,
  TextButton,
  TextColor,
  TextVariant,
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  IDOS_PRIVACY_NOTICE_URL,
  METAMASK_PRIVACY_POLICY_URL,
  METAMASK_TERMS_URL,
} from '../../../Ramp/Views/VirtualBankAccount/constants';
import type { KycCatalogDisclaimerLink } from '../../hooks/useKycSessionDisclaimers';
import { VbaVerifyIdentitySelectorsIDs } from './VerifyIdentity.testIds';

interface TermsLink {
  id: string;
  title: string;
  url: string;
  testID: string;
}

const TermsLinkRow = ({ link }: { link: TermsLink }) => {
  const openLink = useCallback(() => Linking.openURL(link.url), [link.url]);

  return (
    <ListItem
      isInteractive
      variant={ContentVariant.OneLine}
      title={link.title}
      endAccessory={
        <Icon
          name={IconName.Arrow2UpRight}
          size={IconSize.Lg}
          color={IconColor.IconDefault}
        />
      }
      onPress={openLink}
      accessibilityRole="link"
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
 * stays disabled until the consent switch is on. Agreeing closes the sheet,
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

  const openIdosPrivacyNotice = useCallback(
    () => Linking.openURL(IDOS_PRIVACY_NOTICE_URL),
    [],
  );

  const handleAgree = useCallback(() => {
    sheetRef.current?.onCloseBottomSheet(onAgree);
  }, [onAgree]);

  const links = useMemo<TermsLink[]>(
    () => [
      {
        id: 'metamask-privacy-policy',
        title: strings(
          'virtual_bank_account.verify_identity.metamask_privacy_policy',
        ),
        url: METAMASK_PRIVACY_POLICY_URL,
        testID: VbaVerifyIdentitySelectorsIDs.METAMASK_PRIVACY_POLICY_LINK,
      },
      {
        id: 'metamask-terms',
        title: strings('virtual_bank_account.verify_identity.metamask_terms'),
        url: METAMASK_TERMS_URL,
        testID: VbaVerifyIdentitySelectorsIDs.METAMASK_TERMS_LINK,
      },
      ...disclaimers.map((disclaimer) => ({
        id: disclaimer.id,
        title: disclaimer.title,
        url: disclaimer.url,
        testID: `${VbaVerifyIdentitySelectorsIDs.DISCLAIMER_LINK}-${disclaimer.id}`,
      })),
    ],
    [disclaimers],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      onClose={onClose}
      keyboardAvoidingViewEnabled={false}
      testID={VbaVerifyIdentitySelectorsIDs.TERMS_SHEET}
    >
      <Box twClassName="gap-2.5 py-6">
        <Box twClassName="p-4">
          <Text variant={TextVariant.HeadingLg}>
            {strings('virtual_bank_account.verify_identity.terms_sheet_title')}
          </Text>
        </Box>
        <Box>
          {links.map((link) => (
            <TermsLinkRow key={link.id} link={link} />
          ))}
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="gap-4 px-4"
        >
          <Box twClassName="flex-1 gap-2">
            <Text variant={TextVariant.BodyMd}>
              {strings(
                'virtual_bank_account.verify_identity.biometric_consent_label',
              )}
              <TextButton
                variant={TextVariant.BodyMd}
                onPress={openIdosPrivacyNotice}
                accessibilityRole="link"
                testID={VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_LINK}
              >
                {strings(
                  'virtual_bank_account.verify_identity.biometric_consent_link',
                )}
              </TextButton>
              {strings(
                'virtual_bank_account.verify_identity.biometric_consent_label_end',
              )}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Regular}
              color={TextColor.TextAlternative}
            >
              {strings(
                'virtual_bank_account.verify_identity.terms_sheet_description',
              )}
            </Text>
          </Box>
          <Switch
            isOn={hasBiometricConsent}
            onValueChange={setHasBiometricConsent}
            accessibilityHint={`${strings(
              'virtual_bank_account.verify_identity.biometric_consent_label',
            )}${strings(
              'virtual_bank_account.verify_identity.biometric_consent_link',
            )}${strings(
              'virtual_bank_account.verify_identity.biometric_consent_label_end',
            )}`}
            testID={VbaVerifyIdentitySelectorsIDs.BIOMETRIC_CONSENT_SWITCH}
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
