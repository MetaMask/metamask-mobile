import React from 'react';
import {
  FontWeight,
  Tag,
  TagSeverity,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { PERPS_CONSTANTS, type MarginMode } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';

/**
 * Label for a margin mode, including the unresolved placeholder.
 * Shared by the tag and any accessible name that must match it.
 *
 * @param marginMode - Venue mode, or undefined while the position stream has not resolved.
 * @returns The localized mode name, or the data fallback.
 */
export const getPerpsMarginModeLabel = (
  marginMode: MarginMode | undefined,
): string =>
  marginMode === undefined
    ? PERPS_CONSTANTS.FallbackDataDisplay
    : strings(
        marginMode === 'cross'
          ? 'perps.margin_mode.cross_title'
          : 'perps.margin_mode.isolated_title',
      );

interface PerpsMarginModeTagProps {
  /**
   * Venue margin mode this tag names. Pass undefined while the position
   * stream has not resolved, so the tag does not claim Isolated early.
   */
  marginMode: MarginMode | undefined;
  /** Identifies the text that holds this tag's value. */
  testID?: string;
}

/** Neutral Isolated/Cross label shared by every surface that shows the mode. */
const PerpsMarginModeTag = ({
  marginMode,
  testID,
}: PerpsMarginModeTagProps) => (
  <Tag severity={TagSeverity.Neutral}>
    <Text
      testID={testID}
      variant={TextVariant.BodyXs}
      fontWeight={FontWeight.Medium}
      color={TextColor.TextAlternative}
    >
      {getPerpsMarginModeLabel(marginMode)}
    </Text>
  </Tag>
);

export default PerpsMarginModeTag;
