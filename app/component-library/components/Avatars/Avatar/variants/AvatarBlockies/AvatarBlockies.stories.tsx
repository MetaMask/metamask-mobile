// Third party dependencies.
import React from 'react';
import { text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { getAvatarBaseStoryProps } from '../../foundation/AvatarBase/AvatarBase.stories';

// Internal dependencies.
import AvatarBlockies from './AvatarBlockies';
import { AvatarBlockiesProps } from './AvatarBlockies.types';
import { TEST_AVATAR_BLOCKIES_ACCOUNT_ADDRESS } from './AvatarBlockies.constants';

export const getAvatarBlockiesStoryProps = (): AvatarBlockiesProps => ({
  ...getAvatarBaseStoryProps(),
  accountAddress: text(
    'accountAddress',
    TEST_AVATAR_BLOCKIES_ACCOUNT_ADDRESS,
    storybookPropsGroupID,
  ),
});
const AvatarBlockiesStory = () => (
  <AvatarBlockies {...getAvatarBlockiesStoryProps()} />
);

export default AvatarBlockiesStory;
