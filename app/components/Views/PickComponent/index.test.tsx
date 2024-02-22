import React from 'react';
import { render } from '@testing-library/react-native';
import PickComponent from './';

describe('PickComponent', () => {
  it('should render correctly', () => {
    const wrapper = render(
      <PickComponent
        textFirst={'Text First'}
        valueFirst={'valueFirst'}
        textSecond={'Text Second'}
        valueSecond={'valueSecond'}
        selectedValue={'valueSecond'}
      />,
    );
    expect(wrapper).toMatchSnapshot();
  });
});
