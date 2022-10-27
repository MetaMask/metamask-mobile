/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, { TextVariants } from '../../Texts/Text';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';
import { TEST_BADGE_PROPS } from './BadgeWrapper.constants';

storiesOf('Component Library / BadgeWrapper', module).add('Default', () => (
  <BadgeWrapper badgeProps={TEST_BADGE_PROPS}>
    <View
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        height: 50,
        backgroundColor: mockTheme.colors.background.default,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text variant={TextVariants.sBodySM}>{'Wrapped Content'}</Text>
    </View>
  </BadgeWrapper>
));
