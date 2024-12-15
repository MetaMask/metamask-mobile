/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/display-name */
import React from 'react';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import { BadgeProps, BadgeVariant } from '../Badge/Badge.types';
import { SAMPLE_BADGENETWORK_PROPS } from '../Badge/variants/BadgeNetwork/BadgeNetwork.constants';
import { SAMPLE_BADGESTATUS_PROPS } from '../Badge/variants/BadgeStatus/BadgeStatus.constants';
import Badge from '../Badge/Badge';
import Text, { TextVariant, TextColor } from '../../Texts/Text';

// Internal dependencies.
import { default as BadgeWrapperComponent } from './BadgeWrapper';
import { SAMPLE_BADGEWRAPPER_PROPS } from './BadgeWrapper.constants';
import { BadgeAnchorElementShape, BadgePosition } from './BadgeWrapper.types';
import { View } from 'react-native';

enum BadgeSelectorOptions {
  NetworkImage = 'network-image',
  NetworkInitial = 'network-initial',
  Status = 'status',
}

const BadgeWrapperMeta = {
  title: 'Component Library / Badges',
  component: BadgeWrapperComponent,
  argTypes: {
    anchorElementShape: {
      options: BadgeAnchorElementShape,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BADGEWRAPPER_PROPS.anchorElementShape,
    },
    badgePosition: {
      options: BadgePosition,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BADGEWRAPPER_PROPS.badgePosition,
    },
    badge: {
      options: BadgeSelectorOptions,
      control: {
        type: 'select',
      },
      defaultValue: BadgeSelectorOptions.NetworkInitial,
    },
  },
};
export default BadgeWrapperMeta;

export const BadgeWrapper = {
  // eslint-disable-next-line react/prop-types
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  render: (args: { [x: string]: any; badge: any; anchorElementShape: any }) => {
    const { badge, anchorElementShape, ...props } = args;
    let badgeProps: BadgeProps;
    switch (badge) {
      case BadgeSelectorOptions.NetworkImage:
        badgeProps = {
          variant: BadgeVariant.Network,
          ...SAMPLE_BADGENETWORK_PROPS,
        };
        break;
      case BadgeSelectorOptions.NetworkInitial:
        badgeProps = {
          variant: BadgeVariant.Network,
          name: SAMPLE_BADGENETWORK_PROPS.name,
        };
        break;
      case BadgeSelectorOptions.Status:
        badgeProps = {
          variant: BadgeVariant.Status,
          ...SAMPLE_BADGESTATUS_PROPS,
        };
        break;
      default:
        badgeProps = {
          variant: BadgeVariant.Network,
          ...SAMPLE_BADGENETWORK_PROPS,
        };
        break;
    }
    const BadgeElement = <Badge {...badgeProps} />;
    return (
      <View
        style={{
          margin: 10,
        }}
      >
        <BadgeWrapperComponent badgeElement={BadgeElement} {...props}>
          <View
            // eslint-disable-next-line react-native/no-inline-styles
            style={{
              height: 32,
              width: 32,
              borderRadius:
                anchorElementShape === BadgeAnchorElementShape.Circular
                  ? 999
                  : 2,
              backgroundColor: mockTheme.colors.primary.default,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text variant={TextVariant.BodySM} color={TextColor.Inverse}>
              {'C'}
            </Text>
          </View>
        </BadgeWrapperComponent>
      </View>
    );
  },
};
