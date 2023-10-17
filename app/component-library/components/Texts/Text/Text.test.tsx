// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import Text from './Text';
import { TextVariant } from './Text.types';

describe('Text', () => {
  it('should render Text', () => {
    const wrapper = shallow(
      <Text variant={TextVariant.HeadingSMRegular}>{`I'm Text!`}</Text>,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
