import { HeadingElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const heading: UIComponentFactory<HeadingElement> = ({
  element: e,
}) => ({
  element: 'SheetHeader',
  props: {
    title: e.props.children,
  },
});
