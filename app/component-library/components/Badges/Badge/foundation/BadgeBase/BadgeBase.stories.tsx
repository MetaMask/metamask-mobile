/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';
import { storiesOf } from '@storybook/react-native';

// External dependencies.
import { AvatarBaseSize } from '../../../../Avatars/AvatarBase';
import AvatarAccount, {
  AvatarAccountType,
} from '../../../../Avatars/AvatarAccount';
import { DUMMY_WALLET_ADDRESS } from '../../../../Avatars/AvatarAccount/AvatarAccount.constants';
import AvatarNetwork from '../../../../Avatars/AvatarNetwork';
import { TEST_REMOTE_IMAGE_SOURCE } from '../../../../Avatars/AvatarNetwork/AvatarNetwork.constants';
import Tag from '../../../../Tags/Tag';

// Internal dependencies.
import BadgeBase from './BadgeBase';

storiesOf('Component Library / BadgeBase', module).add('Default', () => {
  const groupId = 'Props';

  const sampleTag = <Tag label={'Tag'} />;
  const sampleAvatarAccount = (
    <AvatarAccount
      size={AvatarBaseSize.Md}
      type={AvatarAccountType.JazzIcon}
      accountAddress={DUMMY_WALLET_ADDRESS}
    />
  );
  const sampleAvatarNetwork = (
    <AvatarNetwork
      size={AvatarBaseSize.Md}
      name={'Ethereum'}
      imageSource={TEST_REMOTE_IMAGE_SOURCE}
    />
  );

  const sampleComponents: any = {
    tag: sampleTag,
    avatarAccount: sampleAvatarAccount,
    avatarNetwork: sampleAvatarNetwork,
  };
  const sampleComponentsKeys = Object.keys(sampleComponents);

  const contentKey = select(
    'content',
    sampleComponentsKeys,
    sampleComponentsKeys[0],
    groupId,
  );

  const content = sampleComponents[contentKey];

  return <BadgeBase>{content}</BadgeBase>;
});
