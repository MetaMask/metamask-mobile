import React, { useCallback, type ReactNode } from 'react';
import {
  Box,
  Card,
  ContentVariant,
  FontWeight,
  Icon,
  IconName,
  ListItem,
  SectionHeader,
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

const STEP_COUNTER_KEYS = {
  1: 'virtual_bank_account.verify_identity.step_counter_screen_1',
  2: 'virtual_bank_account.verify_identity.step_counter_screen_2',
} as const;

/** "Step 1 of 2" above the title, for TitleStandard's topAccessory. */
export const TermsStepCounter = ({
  step,
  testID,
}: {
  step: 1 | 2;
  testID: string;
}) => (
  <Text
    variant={TextVariant.BodySm}
    fontWeight={FontWeight.Medium}
    color={TextColor.TextAlternative}
    testID={testID}
  >
    {strings(STEP_COUNTER_KEYS[step])}
  </Text>
);

/** Section header above a terms card, e.g. "Terms and privacy". */
export const TermsSectionTitle = ({ children }: { children: string }) => (
  <SectionHeader
    title={children}
    twClassName="pt-6"
    accessibilityRole="header"
  />
);

/** Filled card that groups each party's documents. */
export const TermsCard = ({ children }: { children: ReactNode }) => (
  <Card twClassName="mx-4 overflow-hidden p-0">{children}</Card>
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
