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

/**
 * Perps "Pro" accent colors from Figma, not yet part of the shared design-token
 * palette (see also `PerpsModeFlashContainer`), so they are defined locally.
 *
 * `PERPS_PRO_ACCENT_COLOR` is `accent/02/normal` — the purple "Pro" text.
 * `PERPS_PRO_ACCENT_SELECTED_BG` is `accent/02/normal` at ~18% over
 * `background/muted` — the purple fill of the selected "Pro" segment.
 */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex
const PERPS_PRO_ACCENT_COLOR = '#d075ff';
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

  // Market header: single outlined pill showing only the active mode, per Figma
  // (transparent fill, `border/muted` border, `accent/02` purple text for Pro).
  // Pressing it flips to the opposite mode (same analytics + onChange path as
  // the full toggle).
  if (variant === 'active') {
    const isPro = mode === PerpsMode.Pro;
    return (
      <ButtonBase
        size={ButtonBaseSize.Sm}
        twClassName="bg-transparent border border-border-muted"
        onPress={() => handleChange(isPro ? PerpsMode.Lite : PerpsMode.Pro)}
        textProps={
          isPro ? { style: { color: PERPS_PRO_ACCENT_COLOR } } : undefined
        }
        testID={
          isPro
            ? PerpsModeToggleSelectorsIDs.PRO_SEGMENT
            : PerpsModeToggleSelectorsIDs.LITE_SEGMENT
        }
      >
        {isPro ? proLabel : liteLabel}
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
        // Pro is the purple-branded mode: its label is always the accent color,
        // and when selected the segment fills with the accent tint (Lite keeps
        // the default segmented-control styling).
        textProps={{ style: { color: PERPS_PRO_ACCENT_COLOR } }}
        style={
          mode === PerpsMode.Pro
            ? { backgroundColor: PERPS_PRO_ACCENT_SELECTED_BG }
            : undefined
        }
      >
        {proLabel}
      </FilterButton>
    </SegmentedControl>
  );
};

export default PerpsModeToggle;
