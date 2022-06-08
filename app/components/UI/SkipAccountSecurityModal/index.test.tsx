import React from 'react';
import { shallow } from 'enzyme';
import SkipAccountSecurityModal from './';

const noop = () => ({});

describe('HintModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SkipAccountSecurityModal
        onCancel={noop}
        onConfirm={noop}
        onPress={noop}
        toggleSkipCheckbox={noop}
        modalVisible={false}
        skipCheckbox={false}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
