import React from 'react';
import { Checkbox, TextVariant } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

export interface PerpsAggregatedFillsCheckboxProps {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  testID?: string;
}

/**
 * MMDS checkbox that toggles same-block fill aggregation on Perps activity
 * lists. Checked (aggregated) is the default, matching Hyperliquid.
 */
const PerpsAggregatedFillsCheckbox: React.FC<
  PerpsAggregatedFillsCheckboxProps
> = ({ isSelected, onChange, testID }) => (
  <Checkbox
    label={strings('perps.transactions.aggregated')}
    labelProps={{ variant: TextVariant.BodySm }}
    isSelected={isSelected}
    onChange={onChange}
    testID={testID}
  />
);

export default PerpsAggregatedFillsCheckbox;
