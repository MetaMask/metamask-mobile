// Third party dependencies.
import React from 'react';

// Internal dependencies.
import PickerNetwork from './PickerNetwork';
import { render } from '@testing-library/react-native';
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
});
