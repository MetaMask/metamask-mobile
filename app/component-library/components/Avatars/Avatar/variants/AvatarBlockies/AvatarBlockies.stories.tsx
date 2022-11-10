// Third party dependencies.
import React from 'react';
import { text, select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { AvatarSizes } from '../../Avatar.types';
import { DEFAULT_AVATAR_SIZE } from '../../Avatar.constants';

// Internal dependencies.
import AvatarBlockies from './AvatarBlockies';
import { AvatarBlockiesProps } from './AvatarBlockies.types';
import { DUMMY_WALLET_ADDRESS } from './AvatarBlockies.constants';

export const getAvatarBlockiesStoryProps = (): AvatarBlockiesProps => ({
  accountAddress: text(
    'accountAddress',
    DUMMY_WALLET_ADDRESS,
    storybookPropsGroupID,
  ),
  size: select('size', AvatarSizes, DEFAULT_AVATAR_SIZE, storybookPropsGroupID),
});
const AvatarBlockiesStory = () => (
  <AvatarBlockies {...getAvatarBlockiesStoryProps()} />
);

export default AvatarBlockiesStory;
