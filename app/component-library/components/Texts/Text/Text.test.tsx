// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Text from './Text';
import { TextVariants } from './Text.types';

describe('Text', () => {
  it('should render Text', () => {
    const wrapper = shallow(
      <Text variant={TextVariants.lBodyMD}>{`I'm Text!`}</Text>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
