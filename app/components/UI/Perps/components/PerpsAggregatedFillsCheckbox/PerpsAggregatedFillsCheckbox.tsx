import React from 'react';
import {
  Box,
  ButtonBase,
  ButtonBaseSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
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
 * Pill control that toggles same-block fill aggregation on Perps activity
 * lists. Its 16px checkbox matches the compact control specified in Figma,
 * while ButtonBase provides the same pill and typography as adjacent filters.
 *
 * This composes design-system primitives instead of using MMDS Checkbox
 * because that component applies its fixed 22px box and 2px border after
 * `checkboxContainerProps`, so those props cannot produce this 16px/1px spec.
 * Pill control that toggles per-order fill aggregation on the Perps trade activity list.
 * Built on the design-system Checkbox so the interactive node carries the checkbox role and
 * checked state assistive technology expects, wrapped in the pill shape and typography of the
 * filter chips it sits beside.
 */
const PerpsAggregatedFillsCheckbox: React.FC<
  PerpsAggregatedFillsCheckboxProps
> = ({ isSelected, onChange, testID }) => (
  <ButtonBase
    size={ButtonBaseSize.Md}
    startAccessory={
      <Box
        twClassName={`size-4 shrink-0 items-center justify-center rounded border ${
          isSelected ? 'border-icon-default bg-icon-default' : 'border-default'
        }`}
      >
        {isSelected ? (
          <Icon
            testID={testID ? `${testID}-check-icon` : undefined}
            name={IconName.Check}
            size={IconSize.Xs}
            color={IconColor.IconInverse}
          />
        ) : null}
      </Box>
    }
    contentWrapperProps={{ style: { gap: 6 } }}
    twClassName="pl-4"
    role="checkbox"
    accessibilityState={{ checked: isSelected }}
    onPress={() => onChange(!isSelected)}
    testID={testID}
  >
    {strings('perps.transactions.aggregated')}
  </ButtonBase>
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
