// Third party dependencies.
import React from 'react';

// External dependencies.
import { NetworkProps } from '../../../../Networks/Network/Network.types';
import { getNetworkStoryProps } from '../../../../Networks/Network/Network.stories';

// Internal dependencies.
import BadgeNetwork from './BadgeNetwork';
import { BadgeNetworkProps } from './BadgeNetwork.types';

export const getBadgeNetworkStoryProps = (): BadgeNetworkProps => {
  const networkProps: NetworkProps = getNetworkStoryProps();

  return {
    networkProps,
  };
};
const BadgeNetworkStory = () => (
  <BadgeNetwork {...getBadgeNetworkStoryProps()} />
);

export default BadgeNetworkStory;
