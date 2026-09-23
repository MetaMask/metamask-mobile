import React from 'react';
import {
  Checkbox,
  FontWeight,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

export interface PerpsAggregatedFillsCheckboxProps {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  testID?: string;
}

/**
 * Pill control that toggles per-order fill aggregation on the Perps trade activity list.
 * Built on the design-system Checkbox so the interactive node carries the checkbox role and
 * checked state assistive technology expects, wrapped in the pill shape and typography of the
 * filter chips it sits beside.
 */
const PerpsAggregatedFillsCheckbox: React.FC<
  PerpsAggregatedFillsCheckboxProps
> = ({ isSelected, onChange, testID }) => (
  <Checkbox
    isSelected={isSelected}
    onChange={onChange}
    label={strings('activity_view.aggregated')}
    labelProps={{ variant: TextVariant.BodyMd, fontWeight: FontWeight.Medium }}
    twClassName="h-10 self-start rounded-full bg-muted px-4"
    testID={testID}
  />
);

export default PerpsAggregatedFillsCheckbox;
