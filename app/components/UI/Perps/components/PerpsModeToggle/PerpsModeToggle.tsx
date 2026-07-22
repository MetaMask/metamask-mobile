import React, { useCallback } from 'react';
import {
  ButtonBase,
  ButtonBaseSize,
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
import PerpsProGradientLabel from './PerpsProGradientLabel';

/**
 * Selected "Pro" segment fill from Figma — `accent/02/normal` at ~18% over
 * `background/muted`. Not yet part of the shared design-token palette.
 */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const PERPS_PRO_ACCENT_SELECTED_BG = '#382b43';

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
  const proGradientLabel = (
    <PerpsProGradientLabel>{proLabel}</PerpsProGradientLabel>
  );

  // Market header: single outlined pill showing only the active mode, per Figma
  // (transparent fill, `border/muted` border, gradient "Pro" text). Pressing it
  // flips to the opposite mode (same analytics + onChange path as the full
  // toggle).
  if (variant === 'active') {
    const isPro = mode === PerpsMode.Pro;
    const nextModeLabel = isPro ? liteLabel : proLabel;
    const currentModeLabel = isPro ? proLabel : liteLabel;
    return (
      <ButtonBase
        size={ButtonBaseSize.Sm}
        twClassName="bg-transparent border border-border-muted"
        onPress={() => handleChange(isPro ? PerpsMode.Lite : PerpsMode.Pro)}
        accessibilityLabel={strings(
          'perps.mode.active_pill_accessibility_label',
          { mode: currentModeLabel },
        )}
        accessibilityHint={strings(
          'perps.mode.active_pill_accessibility_hint',
          { mode: nextModeLabel },
        )}
        testID={
          isPro
            ? PerpsModeToggleSelectorsIDs.PRO_SEGMENT
            : PerpsModeToggleSelectorsIDs.LITE_SEGMENT
        }
      >
        {isPro ? proGradientLabel : liteLabel}
      </ButtonBase>
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
        // Pro label uses the Figma accent gradient; when selected the segment
        // fills with the accent tint (Lite keeps the default styling).
        style={
          mode === PerpsMode.Pro
            ? { backgroundColor: PERPS_PRO_ACCENT_SELECTED_BG }
            : undefined
        }
      >
        {proGradientLabel}
      </FilterButton>
    </SegmentedControl>
  );
};

export default PerpsModeToggle;
