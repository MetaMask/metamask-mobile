import React from 'react';
import { shallow } from 'enzyme';

import Text from './Text';
import { TextVariant } from './Text.types';

describe('Text', () => {
  it('should render Text', () => {
    const wrapper = shallow(
      <Text variant={TextVariant.lBodyMD}>{`I'm Text!`}</Text>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
