// Third party dependencies.
import React from 'react';

// Internal dependencies.
import Loader from './Loader';
import { LoaderProps } from './Loader.types';

const LoaderMeta = {
  title: 'Components Temp / Loader',
  component: Loader,
  argTypes: {
    size: {
      options: ['small', 'large'],
      control: {
        type: 'select',
      },
    },
    color: {
      control: 'color',
    },
  },
};
export default LoaderMeta;

export const DefaultLoader = {
  args: {
    size: 'large',
  },
  render: (args: LoaderProps) => <Loader {...args} />,
};
