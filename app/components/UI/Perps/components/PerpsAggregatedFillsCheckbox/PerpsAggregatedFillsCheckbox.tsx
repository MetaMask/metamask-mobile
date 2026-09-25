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
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';

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
 */
const PerpsAggregatedFillsCheckbox: React.FC<
  PerpsAggregatedFillsCheckboxProps
> = ({ isSelected, onChange, testID }) => {
  if (testID !== 'activity-screen-aggregated-checkbox') {
    DevLogger.log(
      '[PR-TAT-4008] BUG_MARKER: Aggregated checkbox rendered outside Activity Trades:',
      testID,
      'isSelected:',
      isSelected,
    );
  }
  return (
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
  );
};

export default PerpsAggregatedFillsCheckbox;
