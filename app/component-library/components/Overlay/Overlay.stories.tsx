/* eslint-disable no-console */
// External dependencies.
import { mockTheme } from '../../../util/theme';

// Internal dependencies.
import { default as OverlayComponent } from './Overlay';

const OverlayMeta = {
  title: 'Component Library / Overlay',
  component: OverlayComponent,
  argTypes: {
    color: {
      control: { type: 'color' },
      defaultValue: mockTheme.colors.overlay.default,
    },
  },
};
export default OverlayMeta;

export const Overlay = {
  args: {
    onPress: () => console.log("I'm clicked!"),
  },
};
