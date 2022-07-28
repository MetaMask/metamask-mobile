import React from 'react';
import { shallow } from 'enzyme';
import WidgetWebview from './';

describe('WidgetWebview', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <WidgetWebview
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
