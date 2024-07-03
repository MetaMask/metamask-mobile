import React from 'react';
import { render } from '@testing-library/react-native';

import { PPOMView } from './PPOMView';

describe('PPOMView', () => {
  it('should render correctly', () => {
    expect(() => {
      render(<PPOMView />);
    }).not.toThrow();
  });
});
