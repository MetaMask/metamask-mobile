// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import PickerNetwork from './PickerNetwork';
import { SAMPLE_PICKERNETWORK_PROPS } from './PickerNetwork.constants';

describe('PickerNetwork', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <PickerNetwork
        onPress={jest.fn}
        label={SAMPLE_PICKERNETWORK_PROPS.label}
        imageSource={SAMPLE_PICKERNETWORK_PROPS.imageSource}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
