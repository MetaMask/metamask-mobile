import React from 'react';
import Balance from '.';
import { render } from '@testing-library/react-native';

describe('Balance', () => {
  it('should render correctly with a fiat balance', () => {
    const wrapper = render(<Balance balance="123" fiatBalance="456" />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly without a fiat balance', () => {
    const wrapper = render(<Balance balance="123" fiatBalance={undefined} />);
    expect(wrapper).toMatchSnapshot();
  });
});
