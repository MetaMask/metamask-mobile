import React from 'react';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';

export interface PerpsAggregatedFillsCheckboxProps {
  isSelected: boolean;
  onChange: (isSelected: boolean) => void;
  testID?: string;
}

/**
 * Pill control that toggles same-block fill aggregation on Perps activity
 * lists. Its 16px checkbox matches the compact control specified in Figma,
 * while ButtonBase provides the same pill and typography as adjacent filters.
 */
const PerpsAggregatedFillsCheckbox: React.FC<
  PerpsAggregatedFillsCheckboxProps
> = ({ isSelected, onChange, testID }) => (
  <ButtonBase
    size={ButtonBaseSize.Md}
    startAccessory={
      <Box
        testID={testID ? `${testID}-box` : undefined}
        twClassName={`size-4 shrink-0 items-center justify-center rounded border ${
          isSelected ? 'border-icon-default bg-icon-default' : 'border-default'
        }`}
      >
        {isSelected ? (
          <Icon
            testID={testID ? `${testID}-check-icon` : undefined}
            name={IconName.Check}
            size={IconSize.Sm}
            color={IconColor.IconInverse}
          />
        ) : null}
      </Box>
    }
    contentWrapperProps={{ style: { gap: 6 } }}
    twClassName="pl-4"
    accessibilityRole="checkbox"
    accessibilityState={{ checked: isSelected }}
    onPress={() => onChange(!isSelected)}
    testID={testID}
  >
    {strings('perps.transactions.aggregated')}
  </ButtonBase>
);

export default PerpsAggregatedFillsCheckbox;
