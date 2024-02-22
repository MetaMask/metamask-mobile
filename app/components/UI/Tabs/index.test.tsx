import React from 'react';
import { render } from '@testing-library/react-native';
import Tabs from './';

describe('Tabs', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <Tabs tabs={[{ id: 1, url: 'about:blank', image: '' }]} />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
