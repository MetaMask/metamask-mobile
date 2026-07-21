import React, { useCallback } from 'react';
import {
  FilterButton,
  SegmentedControl,
  SegmentedControlSize,
} from '@metamask/design-system-react-native';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
  PerpsMode,
} from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { PerpsModeToggleSelectorsIDs } from '../../Perps.testIds';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { type PerpsModeToggleProps } from './PerpsModeToggle.types';

/**
 * Reusable Lite ⇄ Pro mode toggle for Perps entry points (TAT-3551).
 *
 * Rendered as a two-segment pill built on the design-system `SegmentedControl`
 * / `FilterButton`. A single component powers every entry point:
 * - Trade bottom-sheet menu (Perps row)
 * - Perps home header
 * - Market header (`variant="active"` shows only the active mode)
 */
const PerpsModeToggle: React.FC<PerpsModeToggleProps> = ({
  mode,
  onChange,
  variant = 'toggle',
  size = SegmentedControlSize.Sm,
  isFullWidth = false,
  source,
  testID = PerpsModeToggleSelectorsIDs.CONTAINER,
}) => {
  const { track } = usePerpsEventTracking();

  const handleChange = useCallback(
    (value: string) => {
      const nextMode = value as PerpsMode;
      if (nextMode === mode) {
        return;
      }

      track(MetaMetricsEvents.PERPS_UI_INTERACTION, {
        [PERPS_EVENT_PROPERTY.INTERACTION_TYPE]:
          PERPS_EVENT_VALUE.INTERACTION_TYPE.BUTTON_CLICKED,
        [PERPS_EVENT_PROPERTY.MODE]: nextMode,
        ...(source ? { [PERPS_EVENT_PROPERTY.SOURCE]: source } : {}),
      });

      onChange?.(nextMode);
    },
    [mode, onChange, source, track],
  );

  const liteLabel = strings('perps.mode.lite');
  const proLabel = strings('perps.mode.pro');

  // Market header: read-only single pill showing only the active mode.
  if (variant === 'active') {
    const isPro = mode === PerpsMode.Pro;
    return (
      <FilterButton
        size={size}
        isSelected
        value={mode}
        testID={
          isPro
            ? PerpsModeToggleSelectorsIDs.PRO_SEGMENT
            : PerpsModeToggleSelectorsIDs.LITE_SEGMENT
        }
      >
        {isPro ? proLabel : liteLabel}
      </FilterButton>
    );
  }

  return (
    <SegmentedControl
      value={mode}
      onChange={handleChange}
      size={size}
      isFullWidth={isFullWidth}
      testID={testID}
    >
      <FilterButton
        value={PerpsMode.Lite}
        testID={PerpsModeToggleSelectorsIDs.LITE_SEGMENT}
      >
        {liteLabel}
      </FilterButton>
      <FilterButton
        value={PerpsMode.Pro}
        testID={PerpsModeToggleSelectorsIDs.PRO_SEGMENT}
      >
        {proLabel}
      </FilterButton>
    </SegmentedControl>
  );
};

export default PerpsModeToggle;
