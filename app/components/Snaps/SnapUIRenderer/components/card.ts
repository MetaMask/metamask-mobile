/* eslint-disable @typescript-eslint/no-shadow */
import { CardElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import { mapToTemplate } from '../utils';

export const card: UIComponentFactory<CardElement> = ({
  element,
  ...params
}) => {
  if (typeof element.props.title !== 'string') {
    return {
      element: 'SnapUICard',
      props: {
        image: element.props.image,
        description: element.props.description,
        value: element.props.value,
        extra: element.props.extra,
      },
      propComponents: {
        title: mapToTemplate({ element: element.props.title, ...params }),
      },
    };
  }

  return {
    element: 'SnapUICard',
    props: {
      image: element.props.image,
      title: element.props.title,
      description: element.props.description,
      value: element.props.value,
      extra: element.props.extra,
    },
  };
};
