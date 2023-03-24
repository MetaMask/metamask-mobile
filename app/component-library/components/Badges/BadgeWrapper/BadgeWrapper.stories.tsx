/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import {
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
} from '../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';
import { BadgeProps, BadgeVariants } from '../Badge/Badge.types';
import Text, { TextVariant } from '../../Texts/Text';
import { storybookPropsGroupID } from '../../../constants/storybook.constants';
import Badge from '../Badge/Badge';
import { BadgeStatusState } from '../Badge/variants/BadgeStatus/BadgeStatus.types';

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
  const badgeProps: BadgeProps = {
    variant: BadgeVariants.Network,
    name: TEST_NETWORK_NAME,
  };
  const BadgeElement = <Badge {...badgeProps} />;

  return (
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        margin: 50,
      }}
    >
      <BadgeWrapper
        anchorElementShape={anchorElementShapeSelector}
        badgePosition={badgePositionSelector}
        badge={BadgeElement}
      >
        <View
          // eslint-disable-next-line react-native/no-inline-styles
          style={{
            height: 100,
            width: 100,
            borderRadius: 50,
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
