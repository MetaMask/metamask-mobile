// Third party dependencies.
import React from 'react';
import { shallow } from 'enzyme';

// Internal dependencies.
import TagUrl from './TagUrl';

describe('TagUrl', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <TagUrl
        url={'https://uniswap.org/favicon.ico'}
        label={'https://uniswap.org'}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
