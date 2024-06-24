// Third party dependencies.
import React from 'react';

// Internal dependencies.
import { LoaderProps } from './Loader.types';
import Loader from './Loader';

const LoaderMeta = {
  title: 'Component Library / Loader',
  component: Loader,
  argTypes: {
    size: {
      control: {
        type: 'select',
      },
      options: ['small', 'large'],
      defaultValue: 'large',
    },
    color: {
      control: 'color',
    },
  },
};
export default LoaderMeta;

export const DefaultLoader = (args: LoaderProps) => <Loader {...args} />;
