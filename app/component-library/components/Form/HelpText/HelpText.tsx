/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import Text from '../../Texts/Text';

// Internal dependencies.
import { HelpTextProps } from './HelpText.types';
import {
  DEFAULT_HELPTEXT_SEVERITY,
  DEFAULT_HELPTEXT_TEXT_VARIANT,
  HELPTEXT_TEST_ID,
  TEXT_COLOR_BY_HELPTEXT_SEVERITY,
} from './HelpText.constants';

/**
 * @deprecated This component is deprecated and will be removed in a future release.
 * Please use the HelpText component from @metamask/design-system-react-native instead.
 * @see {@link https://github.com/MetaMask/metamask-design-system/tree/main/packages/design-system-react-native/src/components/HelpText | Component Source}
 */
const HelpText: React.FC<HelpTextProps> = ({
  severity = DEFAULT_HELPTEXT_SEVERITY,
  ...props
}) => (
  <Text
    variant={DEFAULT_HELPTEXT_TEXT_VARIANT}
    color={TEXT_COLOR_BY_HELPTEXT_SEVERITY[severity]}
    testID={HELPTEXT_TEST_ID}
    {...props}
  />
);

export default HelpText;
