import { StyleSheet } from 'react-native';
import { typography } from '@metamask/design-tokens';

// Same visible gap as the money card to the tokens divider:
// portfolio header paddingBottom (12) + SectionDivider margin (20).
const REFERENCE_SPACING = 32;
// Flex gap between this block and the action buttons in the portfolio header.
const PORTFOLIO_HEADER_GAP = 16;
// HeaderRoot is min-h-14; the account capsule is h-10 and vertically centered.
const HEADER_CAPSULE_INSET = (56 - 40) / 2;

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

const createStyles = ({ isGlass }: { isGlass: boolean }) =>
  StyleSheet.create({
    accountGroupBalance: {
      marginHorizontal: 16,
    },
    balanceContainer: {
      flexDirection: 'column',
      gap: 4,
      alignItems: 'flex-start',
      ...(isGlass && {
        marginTop: Math.round(
          REFERENCE_SPACING -
            HEADER_CAPSULE_INSET -
            inkInset(displaySize, displayLine, 'aboveCap'),
        ),
        marginBottom: Math.round(
          REFERENCE_SPACING -
            PORTFOLIO_HEADER_GAP -
            inkInset(changeSize, changeLine, 'belowBaseline'),
        ),
      }),
    },
  });

export default createStyles;
