// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';

// External dependencies.
import { AvatarAccountType } from '../../Avatars/Avatar/variants/AvatarAccount';

// Internal dependencies.
import PickerAccount from './PickerAccount';
import { SAMPLE_PICKERACCOUNT_PROPS } from './PickerAccount.constants';

describe('PickerAccount', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <PickerAccount
        accountAddress={SAMPLE_PICKERACCOUNT_PROPS.accountAddress}
        accountName={SAMPLE_PICKERACCOUNT_PROPS.accountName}
        accountAvatarType={AvatarAccountType.JazzIcon}
        onPress={jest.fn}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
