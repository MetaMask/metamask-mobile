import React from 'react';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { strings } from '../../../../../../../locales/i18n';
import { useTheme } from '../../../../../../util/theme';
import BlockaidLogo from '../../../../../../images/blockaid-logo.svg';
import { SecurityAttributionSelectors } from './SecurityAttribution.testIds';

/**
 * Height matched to the `BodyXs` beside it so the mark and the clause sit on
 * one optical line; width derived from the asset's 62x13 so it is not squashed.
 */
const LOGO_HEIGHT = 10;
const LOGO_WIDTH = 48;

export interface SecurityAttributionProps {
  /**
   * Whole minutes since the payload was fetched. `0` reads as "just now";
   * `null` means nothing has been fetched and renders the provider alone.
   */
  fetchedMinutesAgo: number | null;
  /** Owned by the caller so each surface keeps its own selector. */
  testID: string;
  /** Spacing above, which differs between the tab and the pushed screen. */
  twClassName?: string;
}

/**
 * Who screened the checks above, and when we last fetched their answer.
 *
 * Shared by the Security tab and the Contract security screen, which is
 * reached from it: the two lines sat in both files before, so a copy change
 * had to be made twice to stay consistent across one gesture.
 *
 * The mark carries the brand and the clause is a separate `Text`, which is
 * what lets the clause drop without leaving a dangling separator. The brand
 * therefore has no on-screen text, so the row is one accessibility element
 * with a label naming both halves — otherwise a screen reader would announce
 * "dot updated 3 minutes ago" with nothing to attribute it to.
 */
export const SecurityAttribution: React.FC<SecurityAttributionProps> = ({
  fetchedMinutesAgo,
  testID,
  twClassName,
}) => {
  const tw = useTailwind();

  /**
   * Taken from the theme rather than `tw.color('text-default')`, which
   * resolves the *background* scale: it strips the `text-` prefix and looks up
   * `default`, handing back `background-default` — the page's own background,
   * so the mark came out invisible in both themes.
   */
  const { colors } = useTheme();

  const provider = strings(
    'token_details_v1.security_tab.checks_meta.attribution',
  );
  /**
   * Worded rather than dropped under a minute, so the row keeps its shape: the
   * clause otherwise appeared on its own ~a minute after the fetch, shifting
   * the layout while the user was already reading it.
   */
  let ageClause = null;
  if (fetchedMinutesAgo === 0) {
    ageClause = strings(
      'token_details_v1.security_tab.checks_meta.age_clause_just_now',
    );
  } else if (fetchedMinutesAgo !== null) {
    ageClause = strings(
      'token_details_v1.security_tab.checks_meta.age_clause',
      { count: fetchedMinutesAgo },
    );
  }

  return (
    <Box
      style={tw.style('flex-row items-center gap-2', twClassName)}
      testID={testID}
      accessible
      accessibilityLabel={[provider, ageClause].filter(Boolean).join(' ')}
    >
      {/* `currentColor` in the asset, so one file serves both themes, resolved
          from the `color` prop. Reads at `text-default` rather than the
          clause's muted tone: it is a logo, and dimming it to match the
          timestamp loses the brand. */}
      <BlockaidLogo
        width={LOGO_WIDTH}
        height={LOGO_HEIGHT}
        color={colors.text.default}
        name="blockaid"
        testID={SecurityAttributionSelectors.LOGO}
      />

      {ageClause !== null && (
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {ageClause}
        </Text>
      )}
    </Box>
  );
};

export default SecurityAttribution;
