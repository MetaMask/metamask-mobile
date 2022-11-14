// Third party dependencies.
import React from 'react';
import { select, text } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { storybookPropsGroupID } from '../../../../component-library/constants/storybook.constants';

// Internal dependencies.
import Network from './Network';
import {
  DEFAULT_NETWORK_SIZE,
  SAMPLE_NETWORK_IMAGE_PROPS,
  SAMPLE_NETWORK_NAME,
} from './Network.constants';
import { NetworkProps, NetworkSizes } from './Network.types';

export const getNetworkStoryProps = (): NetworkProps => {
  const sizeSelector = select(
    'size',
    NetworkSizes,
    DEFAULT_NETWORK_SIZE,
    storybookPropsGroupID,
  );
  const networkNameText = text(
    'name',
    SAMPLE_NETWORK_NAME,
    storybookPropsGroupID,
  );

  return {
    size: sizeSelector,
    name: networkNameText,
    imageProps: SAMPLE_NETWORK_IMAGE_PROPS,
  };
};
const NetworkStory = () => <Network {...getNetworkStoryProps()} />;

storiesOf('Component Library / Networks', module).add('Network', NetworkStory);

export default NetworkStory;
