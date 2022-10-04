// Third party dependencies.
import React from 'react';
import { text, select } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';

// Internal dependencies.
import AvatarAccount from './AvatarAccount';
import { AvatarAccountType, AvatarAccountProps } from './AvatarAccount.types';
import { DUMMY_WALLET_ADDRESS } from './AvatarAccount.constants';

export const getAvatarAccountStoryProps = (): AvatarAccountProps => ({
  accountAddress: text(
    'accountAddress',
    DUMMY_WALLET_ADDRESS,
    storybookPropsGroupID,
  ),
  size: select('size', AvatarSize, AvatarSize.Md, storybookPropsGroupID),
  type: select(
    'type',
    AvatarAccountType,
    AvatarAccountType.JazzIcon,
    storybookPropsGroupID,
  ),
});
const AvatarAccountStory = () => (
  <AvatarAccount {...getAvatarAccountStoryProps()} />
);

export default AvatarAccountStory;
