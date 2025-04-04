/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
// Third party dependencies.
import React from 'react';

// External dependencies.
import { SAMPLE_BADGENETWORK_PROPS } from './variants/BadgeNetwork/BadgeNetwork.constants';
import { SAMPLE_BADGESTATUS_PROPS } from './variants/BadgeStatus/BadgeStatus.constants';

// Internal dependencies.
import { BadgeVariant } from './Badge.types';
import { default as BadgeComponent } from './Badge';
import { View } from 'react-native';

const BadgeMeta = {
  title: 'Component Library / Badges',
  component: BadgeComponent,
  argTypes: {
    variant: {
      options: BadgeVariant,
      control: {
        type: 'select',
      },
      defaultValue: BadgeVariant.Network,
    },
  },
};
export default BadgeMeta;

export const Badge = {
  render: (args: { variant: BadgeVariant }) => {
    switch (args.variant) {
      case BadgeVariant.Network:
        return (
          <View
            style={{
              height: 50,
              width: 50,
            }}
          >
            <BadgeComponent
              variant={BadgeVariant.Network}
              {...SAMPLE_BADGENETWORK_PROPS}
            />
          </View>
        );
      case BadgeVariant.Status:
        return (
          <BadgeComponent
            variant={BadgeVariant.Status}
            {...SAMPLE_BADGESTATUS_PROPS}
          />
        );
      default:
        throw new Error('Invalid Badge Variant');
    }
  },
};
