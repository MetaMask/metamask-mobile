/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import Overlay from '../../../../Overlay/Overlay';

// Internal dependencies.
import { BottomSheetOverlayProps } from './BottomSheetOverlay.types';

/**
 * @deprecated Please update your code to use `BottomSheetOverlay` from `@metamask/design-system-react-native`.
 * The API may have changed — compare props before migrating.
 * @see {@link https://github.com/MetaMask/metamask-design-system/blob/main/packages/design-system-react-native/src/components/BottomSheetOverlay/README.md}
 * @since @metamask/design-system-react-native@0.7.0
 */
const BottomSheetOverlay: React.FC<BottomSheetOverlayProps> = ({
  ...props
}) => <Overlay {...props} />;

export default BottomSheetOverlay;
