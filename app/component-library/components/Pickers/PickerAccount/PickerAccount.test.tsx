// Third party dependencies.
import React from 'react';
import { render } from '@testing-library/react-native';
// Internal dependencies.
import PickerAccount from './PickerAccount';
import { SAMPLE_PICKERACCOUNT_PROPS } from './PickerAccount.constants';

describe('PickerAccount', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <PickerAccount
        accountAddress={SAMPLE_PICKERACCOUNT_PROPS.accountAddress}
        accountName={SAMPLE_PICKERACCOUNT_PROPS.accountName}
        onPress={jest.fn}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
