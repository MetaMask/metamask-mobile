/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import Text from '../../Texts/Text';

// Internal dependencies.
import { LabelProps } from './Label.types';
import { DEFAULT_LABEL_TEXT_VARIANT, LABEL_TEST_ID } from './Label.constants';

/**
 * @deprecated Please update your code to use `Label` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/Label/README.md}
 * @since @metamask/design-system-react-native@0.7.0
 */
const Label: React.FC<LabelProps> = ({ ...props }) => (
  <Text
    variant={DEFAULT_LABEL_TEXT_VARIANT}
    testID={LABEL_TEST_ID}
    {...props}
  />
);

export default Label;
