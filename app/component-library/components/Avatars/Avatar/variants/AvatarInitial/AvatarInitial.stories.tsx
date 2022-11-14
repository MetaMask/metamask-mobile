// Third party dependencies.
import React from 'react';
import { color, text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarVariants } from '../../Avatar.types';
import { getAvatarBaseStoryProps } from '../../foundation/AvatarBase/AvatarBase.stories';

// Internal dependencies.
import AvatarInitial from './AvatarInitial';
import { AvatarInitialProps } from './AvatarInitial.types';
import { TEST_AVATAR_INITIAL_SAMPLE_TEXT } from './AvatarInitial.constants';

export const getAvatarInitialStoryProps = (): AvatarInitialProps => {
  const initialText = text(
    'initial',
    TEST_AVATAR_INITIAL_SAMPLE_TEXT,
    storybookPropsGroupID,
  );

  const initialColor = color('initialColor', '', storybookPropsGroupID);
  const backgroundColor = color('backgroundColor', '', storybookPropsGroupID);

  return {
    variant: AvatarVariants.Initial,
    ...getAvatarBaseStoryProps(),
    initial: initialText,
    initialColor,
    backgroundColor,
  };
};
const AvatarInitialStory = () => (
  <AvatarInitial {...getAvatarInitialStoryProps()} />
);

export default AvatarInitialStory;
