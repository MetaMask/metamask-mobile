import React from 'react';
import { render } from '@testing-library/react-native';
import FadeOutOverlay from './';

describe('FadeOutOverlay', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<FadeOutOverlay />);
    expect(toJSON()).toMatchSnapshot();
  });
});
