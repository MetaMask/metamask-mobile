import React from 'react';
import NavigationUnitTest from '.';
import { render } from '@testing-library/react-native';

describe('NavigationUnitTest', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<NavigationUnitTest />);
    expect(toJSON()).toMatchSnapshot();
  });
});
