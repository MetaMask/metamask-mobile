import React, { useCallback, useMemo, useRef } from 'react';
import { Linking } from 'react-native';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  ButtonSize,
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
  type BottomSheetRef,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { METAMASK_PRIVACY_POLICY_URL, METAMASK_TERMS_URL } from './constants';
import type { KycCatalogDisclaimerLink } from './hooks/useKycSessionDisclaimers';
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
      titleProps={{ twClassName: 'underline' }}
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
 * "Data and privacy" confirm sheet over Verify your identity. Agreeing closes
 * the sheet, then hands off to the provider step, which records the session
 * consents and launches SumSub back-to-back.
 */
const VbaProviderTermsSheet = ({
  disclaimers,
  onAgree,
  onClose,
}: VbaProviderTermsSheetProps) => {
  const sheetRef = useRef<BottomSheetRef>(null);

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
      </Box>
      <BottomSheetFooter
        twClassName="pb-2"
        primaryButtonProps={{
          children: strings(
            'virtual_bank_account.verify_identity.terms_sheet_button',
          ),
          size: ButtonSize.Lg,
          onPress: handleAgree,
          testID: VbaVerifyIdentitySelectorsIDs.AGREE_BUTTON,
        }}
      />
    </BottomSheet>
  );
};

export default VbaProviderTermsSheet;
