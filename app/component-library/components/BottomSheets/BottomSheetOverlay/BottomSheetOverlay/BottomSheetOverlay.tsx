/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import Overlay from '../../../../components/Overlay/Overlay';

// Internal dependencies.
import { BottomSheetOverlayProps } from './BottomSheetOverlay.types';

const BottomSheetOverlay: React.FC<BottomSheetOverlayProps> = ({
  ...props
}) => <Overlay {...props} />;

export default BottomSheetOverlay;
