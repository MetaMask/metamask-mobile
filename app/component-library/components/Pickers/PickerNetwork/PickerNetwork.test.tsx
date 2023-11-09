import React from 'react';
import PickerNetwork from './PickerNetwork';
import { render } from '@testing-library/react-native';
import { PICKER_NETWORK_ARROW_TESTID } from './PickerNetwork.constants';
import { TEST_LOCAL_IMAGE_SOURCE } from '../../Avatars/Avatar/variants/AvatarFavicon/AvatarFavicon.constants';

describe('NetworkVerificationInfo', () => {
  it('renders correctly', () => {
    const { toJSON } = render(
      <PickerNetwork
        onPress={jest.fn}
        label={'test'}
        imageSource={TEST_LOCAL_IMAGE_SOURCE}
      />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
  it('does not render Icon when onPress is not passed', () => {
    const { queryByTestId } = render(
      <PickerNetwork label={'test'} imageSource={TEST_LOCAL_IMAGE_SOURCE} />,
    );

    expect(queryByTestId(PICKER_NETWORK_ARROW_TESTID)).toBeNull();
  });
});
