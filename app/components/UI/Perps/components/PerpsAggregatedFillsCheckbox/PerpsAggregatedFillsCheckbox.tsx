import React, { useCallback } from 'react';
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
 * Pill control that toggles per-order fill aggregation on the Perps trade activity list.
 * The 16px checkbox matches the compact control in Figma, while ButtonBase gives it the same
 * pill shape and typography as the filter chips it sits beside.
 */
const PerpsAggregatedFillsCheckbox: React.FC<
  PerpsAggregatedFillsCheckboxProps
> = ({ isSelected, onChange, testID }) => {
  const handlePress = useCallback(
    () => onChange(!isSelected),
    [isSelected, onChange],
  );

  return (
    <ButtonBase
      size={ButtonBaseSize.Md}
      startAccessory={
        <Box
          twClassName={`size-4 shrink-0 items-center justify-center rounded border ${
            isSelected
              ? 'border-icon-default bg-icon-default'
              : 'border-default'
          }`}
        >
          {isSelected ? (
            <Icon
              name={IconName.Check}
              size={IconSize.Xs}
              color={IconColor.IconInverse}
            />
          ) : null}
        </Box>
      }
      contentWrapperProps={{ style: { gap: 6 } }}
      twClassName="pl-4"
      // ButtonBase narrows accessibilityRole and does not allow "checkbox"; the checked
      // state still announces the toggle, matching how other MMDS pills do it.
      accessibilityState={{ checked: isSelected }}
      onPress={handlePress}
      testID={testID}
    >
      {strings('activity.aggregated')}
    </ButtonBase>
  );
};

export default PerpsAggregatedFillsCheckbox;
