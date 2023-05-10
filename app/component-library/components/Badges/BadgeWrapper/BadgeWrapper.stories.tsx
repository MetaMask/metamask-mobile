/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import { BadgeProps, BadgeVariant } from '../Badge/Badge.types';
import Text, { TextVariant } from '../../Texts/Text';
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import Badge from '../Badge/Badge';
import { SAMPLE_BADGENETWORK_PROPS } from '../Badge/variants/BadgeNetwork/BadgeNetwork.constants';
import { SAMPLE_BADGESTATUS_PROPS } from '../Badge/variants/BadgeStatus/BadgeStatus.constants';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';
import { BadgeAnchorElementShape, BadgePosition } from './BadgeWrapper.types';

storiesOf('Component Library / BadgeWrapper', module).add('Default', () => {
  const anchorElementShapeSelector = select(
    'anchorElementShape',
    BadgeAnchorElementShape,
    BadgeAnchorElementShape.Circular,
    storybookPropsGroupID,
  );
  const badgePositionSelector = select(
    'badgePosition',
    BadgePosition,
    BadgePosition.TopRight,
    storybookPropsGroupID,
  );
  const badgeSelectorOptions = {
    NetworkImage: 'network-image',
    NetworkInitial: 'network-initial',
    Status: 'status',
  };

  const badgeSelector = select(
    'badge',
    badgeSelectorOptions,
    badgeSelectorOptions.NetworkInitial,
    storybookPropsGroupID,
  );

  let badgeProps: BadgeProps;

  switch (badgeSelector) {
    case badgeSelectorOptions.NetworkImage:
      badgeProps = {
        ...SAMPLE_BADGENETWORK_PROPS,
      };
      break;
    case badgeSelectorOptions.NetworkInitial:
      badgeProps = {
        variant: BadgeVariant.Network,
        name: SAMPLE_BADGENETWORK_PROPS.name,
      };
      break;
    case badgeSelectorOptions.Status:
      badgeProps = {
        ...SAMPLE_BADGESTATUS_PROPS,
      };
      break;
    default:
      badgeProps = {
        ...SAMPLE_BADGENETWORK_PROPS,
      };
      break;
  }

  const BadgeElement = <Badge {...badgeProps} />;

  return (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        margin: 10,
      }}
    >
      <BadgeWrapper
        anchorElementShape={anchorElementShapeSelector}
        badgePosition={badgePositionSelector}
        badgeElement={BadgeElement}
      >
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            height: 24,
            width: 24,
            borderRadius:
              anchorElementShapeSelector === BadgeAnchorElementShape.Circular
                ? 12
                : 2,
            backgroundColor: mockTheme.colors.background.default,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant={TextVariant.BodySM}>{'C'}</Text>
        </View>
      </BadgeWrapper>
    </View>
  );
});
