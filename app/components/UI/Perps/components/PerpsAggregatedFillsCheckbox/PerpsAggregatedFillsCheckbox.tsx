import React from 'react';
import {
  Checkbox,
  FontWeight,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';

export interface PerpsAggregatedFillsCheckboxProps {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  testID?: string;
}

/**
 * MMDS checkbox that toggles same-block fill aggregation on Perps activity
 * lists. Checked (aggregated) is the default, matching Hyperliquid.
 *
 * Styled to match the `ButtonBase` filter chips it sits next to: same pill
 * (`bg-muted`, `rounded-full`), same 40px height and 16px horizontal padding,
 * same `BodyMd`/`Medium` label, and the same 4px gap the chips put between
 * their label and chevron.
 */
const PerpsAggregatedFillsCheckbox: React.FC<
  PerpsAggregatedFillsCheckboxProps
> = ({ isSelected, onChange, testID }) => {
  const tw = useTailwind();

  return (
    <Checkbox
      label={strings('perps.transactions.aggregated')}
      labelProps={{
        variant: TextVariant.BodyMd,
        fontWeight: FontWeight.Medium,
        color: TextColor.TextDefault,
        // Checkbox hardcodes a 12px label offset in its own twClassName, and
        // `style` is the only prop applied after it.
        style: tw.style('ml-1'),
      }}
      twClassName="h-10 self-start rounded-full bg-muted px-4"
      isSelected={isSelected}
      onChange={onChange}
      testID={testID}
    />
  );
};

export default PerpsAggregatedFillsCheckbox;
