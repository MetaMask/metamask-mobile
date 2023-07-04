/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// Internal dependencies.
import BadgeNetwork from './BadgeNetwork';
import { SAMPLE_BADGENETWORK_PROPS } from './BadgeNetwork.constants';
import { BadgeNetworkProps } from './BadgeNetwork.types';

export const getBadgeNetworkStoryProps = (): BadgeNetworkProps =>
  SAMPLE_BADGENETWORK_PROPS;

const BadgeNetworkStory = () => (
  <View
    // eslint-disable-next-line react-native/no-inline-styles
    style={{
      height: 50,
      width: 50,
    }}
  >
    <BadgeNetwork {...getBadgeNetworkStoryProps()} />
  </View>
);
export default BadgeNetworkStory;
