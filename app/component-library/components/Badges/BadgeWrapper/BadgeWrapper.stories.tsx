/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import {
  TEST_NETWORK_NAME,
  TEST_REMOTE_IMAGE_SOURCE,
} from '../../Avatars/Avatar/variants/AvatarNetwork/AvatarNetwork.constants';
import { BadgeProps, BadgeVariants } from '../Badge/Badge.types';
import Text, { TextVariant } from '../../Texts/Text';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';

storiesOf('Component Library / BadgeWrapper', module).add('Default', () => {
  const badgeProps: BadgeProps = {
    variant: BadgeVariants.Network,
    name: TEST_NETWORK_NAME,
    imageSource: TEST_REMOTE_IMAGE_SOURCE,
  };

  return (
    <BadgeWrapper badgeProps={badgeProps}>
      <View
        // eslint-disable-next-line react-native/no-inline-styles
        style={{
          height: 50,
          backgroundColor: mockTheme.colors.background.default,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant={TextVariant.BodySM}>{'Wrapped Content'}</Text>
      </View>
    </BadgeWrapper>
  );
});
