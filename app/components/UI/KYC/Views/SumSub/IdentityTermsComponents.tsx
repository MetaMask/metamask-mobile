import React, { useCallback, type ReactNode } from 'react';
import {
  Box,
  ContentVariant,
  FontWeight,
  Icon,
  IconName,
  ListItem,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { openExternalUrl } from '../../utils/openExternalUrl';
import { strings } from '../../../../../../locales/i18n';

const opensInBrowserHint = () =>
  strings('virtual_bank_account.verify_identity.opens_in_browser_hint');

/** A link inside a sentence that opens a legal document in the browser. */
export const InlineLink = ({
  url,
  testID,
  variant = TextVariant.BodyMd,
  accessibilityLabel,
  children,
}: {
  url: string;
  testID: string;
  variant?: TextVariant;
  accessibilityLabel?: string;
  children: string;
}) => {
  const openLink = useCallback(() => openExternalUrl(url), [url]);

  return (
    <TextButton
      variant={variant}
      onPress={openLink}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={opensInBrowserHint()}
      testID={testID}
    >
      {children}
    </TextButton>
  );
};

/** A row that opens a legal document in the browser. */
export const TermsLinkRow = ({
  title,
  url,
  testID,
}: {
  title: string;
  url: string;
  testID: string;
}) => {
  const openLink = useCallback(() => openExternalUrl(url), [url]);

  return (
    <ListItem
      isInteractive
      variant={ContentVariant.OneLine}
      title={title}
      endAccessory={<Icon name={IconName.Arrow2UpRight} />}
      onPress={openLink}
      accessibilityRole="link"
      accessibilityHint={opensInBrowserHint()}
      testID={testID}
    />
  );
};

/** "1 of 2" in the header of the two identity terms screens. */
export const TermsStepCounter = ({
  current,
  testID,
}: {
  current: 1 | 2;
  testID: string;
}) => (
  <Text
    variant={TextVariant.BodySm}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextAlternative}
    twClassName="pr-2"
    testID={testID}
  >
    {strings('virtual_bank_account.verify_identity.step_counter', {
      current,
      total: 2,
    })}
  </Text>
);

/** Section label above a terms card, e.g. "MetaMask terms". */
export const TermsSectionTitle = ({ children }: { children: string }) => (
  <Text
    variant={TextVariant.BodySm}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextAlternative}
    twClassName="px-4 pb-2 pt-6 uppercase"
    accessibilityRole="header"
  >
    {children}
  </Text>
);

/** Bordered card that groups each party's documents. */
export const TermsCard = ({ children }: { children: ReactNode }) => (
  <Box twClassName="mx-4 overflow-hidden rounded-xl border border-muted">
    {children}
  </Box>
);

/** One party (MetaMask, idOS, Sumsub) inside a {@link TermsCard}. */
export const TermsParty = ({
  name,
  hasDivider = false,
  children,
}: {
  name: string;
  hasDivider?: boolean;
  children: ReactNode;
}) => (
  <Box twClassName={hasDivider ? 'border-t border-muted py-2' : 'py-2'}>
    <Text
      variant={TextVariant.BodyMd}
      fontWeight={FontWeight.Bold}
      twClassName="px-4 pt-2"
      accessibilityRole="header"
    >
      {name}
    </Text>
    {children}
  </Box>
);
