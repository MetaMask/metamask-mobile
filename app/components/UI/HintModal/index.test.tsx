import React from 'react';
import { shallow } from 'enzyme';
import HintModal from './';

const noop = () => ({});
const hint = 'hint';

describe('HintModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <HintModal
        onCancel={noop}
        onConfirm={noop}
        onChangeText={noop}
        onRequestClose={noop}
        modalVisible={false}
        value={hint}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
