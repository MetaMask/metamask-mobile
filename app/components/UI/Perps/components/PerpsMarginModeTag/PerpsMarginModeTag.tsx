import React from 'react';
import { Tag, TagSeverity } from '@metamask/design-system-react-native';
import type { MarginMode } from '@metamask/perps-controller';
import { strings } from '../../../../../../locales/i18n';

interface PerpsMarginModeTagProps {
  /** Venue margin mode this tag names. */
  marginMode: MarginMode;
  /** Identifies this tag within its surface. */
  testID?: string;
}

/** Neutral Isolated/Cross label shared by every surface that shows the mode. */
const PerpsMarginModeTag = ({
  marginMode,
  testID,
}: PerpsMarginModeTagProps) => (
  <Tag severity={TagSeverity.Neutral} testID={testID}>
    {strings(
      marginMode === 'cross'
        ? 'perps.margin_mode.cross_title'
        : 'perps.margin_mode.isolated_title',
    )}
  </Tag>
);

export default PerpsMarginModeTag;
