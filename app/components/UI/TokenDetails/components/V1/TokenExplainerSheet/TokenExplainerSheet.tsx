import React from 'react';
import {
  BottomSheet,
  BottomSheetFooter,
  Box,
  ButtonSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../../locales/i18n';
import { TokenExplainerSheetSelectors } from './TokenExplainerSheet.testIds';

export interface TokenExplainerSheetProps {
  /** Already-localized heading, spelling out a term a row had to abbreviate. */
  title: string;
  /** Already-localized body copy. */
  description: string;
  /** Called for every dismissal: the button, the backdrop and the swipe down. */
  onClose: () => void;
}

/**
 * Defines a single term from the Token Details V1 page.
 *
 * Opened by tapping any dotted-underlined label — the stat bar's stats and the
 * Security tab's checks and stats all use this one sheet, because they are the
 * same interaction and the same chrome, differing only in which two strings
 * they pass.
 *
 * Takes resolved strings rather than i18n keys so that each surface keeps
 * ownership of its own copy map. That is what lets the Security tab enforce,
 * through `Record<SecurityRowKey, …>`, that no row ships without a definition,
 * while the stat bar enforces the same over `TokenStatKey`.
 *
 * There is no close icon, matching the prototype — the button, the backdrop and
 * a swipe down all dismiss it, and `BottomSheet` routes all three through
 * `onClose`.
 */
export const TokenExplainerSheet: React.FC<TokenExplainerSheetProps> = ({
  title,
  description,
  onClose,
}) => (
  <BottomSheet onClose={onClose} testID={TokenExplainerSheetSelectors.SHEET}>
    {/* `pt-5` lands the title 24px below the drag handle, which the sheet
        chrome already pads by 4px. The sheet also owns the bottom inset, so
        the prototype's 36px of bottom padding needs nothing here. */}
    <Box twClassName="gap-2 px-5 pt-5">
      <Text
        variant={TextVariant.HeadingMd}
        fontWeight={FontWeight.Bold}
        twClassName="text-center"
        testID={TokenExplainerSheetSelectors.TITLE}
      >
        {title}
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        testID={TokenExplainerSheetSelectors.DESCRIPTION}
      >
        {description}
      </Text>
    </Box>
    <BottomSheetFooter
      primaryButtonProps={{
        size: ButtonSize.Lg,
        children: strings('browser.got_it'),
        onPress: onClose,
        testID: TokenExplainerSheetSelectors.GOT_IT_BUTTON,
      }}
      twClassName="px-5 pt-6"
    />
  </BottomSheet>
);

export default TokenExplainerSheet;
