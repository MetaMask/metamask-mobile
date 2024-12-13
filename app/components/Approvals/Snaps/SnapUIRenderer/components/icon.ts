/* eslint-disable @typescript-eslint/no-shadow */
import { IconElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const heading: UIComponentFactory<IconElement> = ({ element }) => ({
  element: 'Icon',
  props: {
    name: element.props.name,
    color: element.props.color,
    size: element.props.size,
  },
});
