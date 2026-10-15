import { StyleSheet } from 'react-native';
import { typography } from '@metamask/design-tokens';

// Same visible gap as the money card to the tokens divider:
// portfolio header paddingBottom (12) + SectionDivider margin (20).
export const BALANCE_REFERENCE_SPACING = 32;
// Flex gap between this block and the action buttons in the portfolio header.
const PORTFOLIO_HEADER_GAP = 16;

// Inter vertical metrics. Line boxes extend past the cap and baseline, so the
// margin has to give that space back to land on the reference gap.
const INTER_UPM = 2048;
const INTER_ASCENDER = 1984;
const INTER_DESCENDER = 494;
const INTER_CAP_HEIGHT = 1490;

const inkInset = (
  fontSize: number,
  lineHeight: number,
  edge: 'aboveCap' | 'belowBaseline',
) => {
  const ascender = (INTER_ASCENDER / INTER_UPM) * fontSize;
  const descender = (INTER_DESCENDER / INTER_UPM) * fontSize;
  const capHeight = (INTER_CAP_HEIGHT / INTER_UPM) * fontSize;
  const leadingPad = Math.max(0, (lineHeight - (ascender + descender)) / 2);

  return edge === 'aboveCap'
    ? leadingPad + (ascender - capHeight)
    : leadingPad + descender;
};

const { fontSize: displaySize, lineHeight: displayLine } =
  typography.sDisplayLG;
const { fontSize: changeSize, lineHeight: changeLine } =
  typography.sBodyMDMedium;

/** Space above the balance's cap height that its line box already takes. */
export const BALANCE_DISPLAY_INK_INSET_ABOVE_CAP = inkInset(
  displaySize,
  displayLine,
  'aboveCap',
);

const createStyles = () =>
  StyleSheet.create({
    accountGroupBalance: {
      marginHorizontal: 16,
    },
    balanceContainer: {
      flexDirection: 'column',
      gap: 4,
      alignItems: 'flex-start',
      marginBottom: Math.round(
        BALANCE_REFERENCE_SPACING -
          PORTFOLIO_HEADER_GAP -
          inkInset(changeSize, changeLine, 'belowBaseline'),
      ),
    },
  });

export default createStyles;
