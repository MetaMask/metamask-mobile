import React from 'react';
import NavigationUnitTest from '.';
import { render } from '@testing-library/react-native';

describe('NavigationUnitTest', () => {
  it('should render correctly', () => {
    const { getByText } = render(<NavigationUnitTest />);
    getByText('TestScreen3 THIS SHOULD NOT HAVE CHANGED, take a deeper look');
  });
});
