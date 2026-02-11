// Third party dependencies.
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

// External dependencies.
import { WalletViewSelectorsIDs } from '../../../../components/Views/Wallet/WalletView.testIds';

// Internal dependencies.
import PickerNetwork from './PickerNetwork';
import {
  PICKERNETWORK_ARROW_TESTID,
  SAMPLE_PICKERNETWORK_PROPS,
} from './PickerNetwork.constants';

describe('PickerNetwork', () => {
  it('renders correctly', () => {
    const { toJSON } = render(
      <PickerNetwork {...SAMPLE_PICKERNETWORK_PROPS} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
  it('does not render Icon when onPress is not passed', () => {
    const { queryByTestId } = render(
      <PickerNetwork
        label={SAMPLE_PICKERNETWORK_PROPS.label}
        imageSource={SAMPLE_PICKERNETWORK_PROPS.imageSource}
      />,
    );

    expect(queryByTestId(PICKERNETWORK_ARROW_TESTID)).toBeNull();
  });

  it('hides network name and shows icon when hideNetworkName is true', () => {
    const { queryByTestId } = render(
      <PickerNetwork
        label={SAMPLE_PICKERNETWORK_PROPS.label}
        imageSource={SAMPLE_PICKERNETWORK_PROPS.imageSource}
        hideNetworkName
      />,
    );

    expect(
      queryByTestId(WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT),
    ).toBeNull();
  });

  it('shows network name when hideNetworkName is false', () => {
    const { queryByTestId } = render(
      <PickerNetwork
        label={SAMPLE_PICKERNETWORK_PROPS.label}
        imageSource={SAMPLE_PICKERNETWORK_PROPS.imageSource}
        hideNetworkName={false}
      />,
    );

    expect(
      queryByTestId(WalletViewSelectorsIDs.NAVBAR_NETWORK_TEXT),
    ).not.toBeNull();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <PickerNetwork
        label={SAMPLE_PICKERNETWORK_PROPS.label}
        imageSource={SAMPLE_PICKERNETWORK_PROPS.imageSource}
        onPress={onPress}
      />,
    );

    fireEvent.press(getByTestId(PICKERNETWORK_ARROW_TESTID));

    expect(onPress).toHaveBeenCalled();
  });
});
