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
import { STAT_EXPLAINER_KEYS } from './StatBar.constants';
import { StatExplainerSheetSelectors } from './StatBar.testIds';
import type { TokenStatKey } from './StatBar.types';

export interface StatExplainerSheetProps {
  /** Decides which explainer copy renders. */
  statKey: TokenStatKey;
  /** Called for every dismissal: the button, the backdrop and the swipe down. */
  onClose: () => void;
}

/**
 * Explains a single stat from the Token Details V1 stat bar.
 *
 * Opened by tapping a stat's dotted-underlined label. There is no close icon,
 * matching the prototype — the button, the backdrop and a swipe down all
 * dismiss it, and `BottomSheet` routes all three through `onClose`.
 *
 * Copy lives in `STAT_EXPLAINER_KEYS`, typed against every `TokenStatKey`, so a
 * stat added for a future variant cannot ship without an explanation.
 */
export const StatExplainerSheet: React.FC<StatExplainerSheetProps> = ({
  statKey,
  onClose,
}) => {
  const { title, description } = STAT_EXPLAINER_KEYS[statKey];

  return (
    <BottomSheet onClose={onClose} testID={StatExplainerSheetSelectors.SHEET}>
      {/* `pt-5` lands the title 24px below the drag handle, which the sheet
          chrome already pads by 4px. The sheet also owns the bottom inset, so
          the prototype's 36px of bottom padding needs nothing here. */}
      <Box twClassName="gap-2 px-5 pt-5">
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          twClassName="text-center"
          testID={StatExplainerSheetSelectors.TITLE}
        >
          {strings(title)}
        </Text>
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          testID={StatExplainerSheetSelectors.DESCRIPTION}
        >
          {strings(description)}
        </Text>
      </Box>
      <BottomSheetFooter
        primaryButtonProps={{
          size: ButtonSize.Lg,
          children: strings('browser.got_it'),
          onPress: onClose,
          testID: StatExplainerSheetSelectors.GOT_IT_BUTTON,
        }}
        twClassName="px-5 pt-6"
      />
    </BottomSheet>
  );
};

export default StatExplainerSheet;
