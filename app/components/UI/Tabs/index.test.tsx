import React from 'react';
import { shallow } from 'enzyme';
import Tabs from './';

describe('Tabs', () => {
  it('should render correctly', () => {
    const wrapper = shallow(
      <Tabs tabs={[{ id: 1, url: 'about:blank', image: '' }]} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
