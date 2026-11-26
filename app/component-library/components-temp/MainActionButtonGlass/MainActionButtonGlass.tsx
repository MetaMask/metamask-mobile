import React from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import {
  MainActionButton,
  type MainActionButtonProps,
} from '@metamask/design-system-react-native';

import BoxGlass from '../BoxGlass';
import { useLiquidGlass } from '../../hooks/useLiquidGlass';

// Clears the button's own `bg-muted` so only the glass shows.
const transparentStyle = { backgroundColor: 'transparent' };

export type MainActionButtonGlassProps = {
  /** The screen's flag. False, or an OS without glass, renders the plain button. */
  isGlass?: boolean;
  /** Layout for the button or its glass wrapper, e.g. `flex: 1` in a row. */
  containerStyle?: StyleProp<ViewStyle>;
} & MainActionButtonProps;

const MainActionButtonGlass = ({
  isGlass = true,
  containerStyle,
  style,
  iconName,
  ...props
}: MainActionButtonGlassProps): React.ReactElement => {
  const { isGlassEnabled } = useLiquidGlass();
  const useGlass = isGlass && isGlassEnabled;
  const resolvedStyle = useGlass ? transparentStyle : (style ?? containerStyle);

  const button = (
    <MainActionButton
      {...props}
      iconName={iconName}
      style={resolvedStyle}
    />
  );

  if (!useGlass) {
    return button;
  }

  return (
    <BoxGlass
      radiusClassName="rounded-2xl"
      isInteractive={!props.isDisabled}
      hasSheen
      containerStyle={containerStyle}
    >
      {button}
    </BoxGlass>
  );
};

export default MainActionButtonGlass;
