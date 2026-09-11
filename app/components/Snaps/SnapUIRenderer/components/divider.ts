import { DividerElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const divider: UIComponentFactory<DividerElement> = ({ theme }) => ({
  element: 'Box',
  props: {
    style: {
      height: 1,
      backgroundColor: theme.colors.border.muted,
    },
  },
});
