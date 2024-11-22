import { DividerElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import { BorderColor } from '../utils';

export const divider: UIComponentFactory<DividerElement> = () => ({
  element: 'Box',
  props: {
    className: 'snap-ui-renderer__divider',
    backgroundColor: BorderColor.borderDefault,
  },
});
