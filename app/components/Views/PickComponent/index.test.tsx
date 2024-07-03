import React from 'react';
import { render } from '@testing-library/react-native';
import PickComponent from './';

describe('PickComponent', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <PickComponent
        textFirst={'Text First'}
        valueFirst={'valueFirst'}
        textSecond={'Text Second'}
        valueSecond={'valueSecond'}
        selectedValue={'valueSecond'}
      />,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
