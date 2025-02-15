import React from 'react';
import { shallow } from 'enzyme';
import SimpleWebview from './';

describe('SimpleWebview', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <SimpleWebview
        navigation={{
          setParams: () => {
            ('');
          },
          setOptions: () => null,
        }}
        route={{ params: { url: 'https://etherscan.io', title: 'etherscan' } }}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
