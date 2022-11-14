// Third party dependencies.
import React from 'react';
import { text } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { getAvatarBaseStoryProps } from '../../foundation/AvatarBase/AvatarBase.stories';

// Internal dependencies.
import AvatarBlockies from './AvatarBlockies';
import { AvatarBlockiesProps } from './AvatarBlockies.types';
import { DUMMY_WALLET_ADDRESS } from './AvatarBlockies.constants';

export const getAvatarBlockiesStoryProps = (): AvatarBlockiesProps => ({
  ...getAvatarBaseStoryProps(),
  accountAddress: text(
    'accountAddress',
    DUMMY_WALLET_ADDRESS,
    storybookPropsGroupID,
  ),
});
const AvatarBlockiesStory = () => (
  <AvatarBlockies {...getAvatarBlockiesStoryProps()} />
);

export default AvatarBlockiesStory;
