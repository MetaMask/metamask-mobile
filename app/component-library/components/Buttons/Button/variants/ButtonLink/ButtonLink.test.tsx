// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import ButtonLink from './ButtonLink';

describe('Link', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <ButtonLink onPress={jest.fn} label={`I'm a Link!`} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
