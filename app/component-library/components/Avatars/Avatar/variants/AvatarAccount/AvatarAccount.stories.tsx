// Third party dependencies.
import React from 'react';
import { text, select } from '@storybook/addon-knobs';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';

// Internal dependencies.
import AvatarAccount from './AvatarAccount';
import { AvatarAccountType } from './AvatarAccount.types';
import { DUMMY_WALLET_ADDRESS } from './AvatarAccount.constants';

const AvatarAccountStory = () => {
  const accountAddress = text(
    'accountAddress',
    DUMMY_WALLET_ADDRESS,
    storybookPropsGroupID,
  );
  const sizeSelector = select(
    'size',
    AvatarSize,
    AvatarSize.Md,
    storybookPropsGroupID,
  );
  const typeSelector = select(
    'type',
    AvatarAccountType,
    AvatarAccountType.JazzIcon,
    storybookPropsGroupID,
  );

  return (
    <AvatarAccount
      size={sizeSelector}
      type={typeSelector}
      accountAddress={accountAddress}
    />
  );
};
export default AvatarAccountStory;
