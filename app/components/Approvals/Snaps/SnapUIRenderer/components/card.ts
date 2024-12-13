/* eslint-disable @typescript-eslint/no-shadow */
import { CardElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const card: UIComponentFactory<CardElement> = ({ element }) => ({
  element: 'Card',
  props: {
    image: element.props.image,
    title: element.props.title,
    description: element.props.description,
    value: element.props.value,
    extra: element.props.extra,
  },
});
