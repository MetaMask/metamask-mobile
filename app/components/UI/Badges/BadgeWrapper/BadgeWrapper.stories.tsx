/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { View } from 'react-native';

// External dependencies.
import { mockTheme } from '../../../../util/theme';
import Text, {
  TextVariants,
} from '../../../../component-library/components/Texts/Text';
import { BadgeProps } from '../Badge/Badge.types';
import { getBadgeStoryProps } from '../Badge/Badge.stories';

// Internal dependencies.
import BadgeWrapper from './BadgeWrapper';
import { BadgeWrapperProps } from './BadgeWrapper.types';

export const getBadgeWrapperStoryProps = (): BadgeWrapperProps => {
  const badgeProps: BadgeProps = getBadgeStoryProps();
  const children = (
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
  );

  return {
    badgeProps,
    children,
  };
};
const BadgeWrapperStory = () => (
  <BadgeWrapper {...getBadgeWrapperStoryProps()} />
);

storiesOf('Component Library / Badges', module).add(
  'BadgeWrapper',
  BadgeWrapperStory,
);

export default BadgeWrapperStory;
