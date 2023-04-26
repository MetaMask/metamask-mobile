// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { AvatarSize } from '../../Avatar.types';

// Internal dependencies.
import AvatarAccount from './AvatarAccount';
import { AvatarAccountType } from './AvatarAccount.types';
import { DUMMY_WALLET_ADDRESS } from './AvatarAccount.constants';

describe('AvatarAccount', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <AvatarAccount
        size={AvatarSize.Xl}
        type={AvatarAccountType.JazzIcon}
        accountAddress={DUMMY_WALLET_ADDRESS}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
