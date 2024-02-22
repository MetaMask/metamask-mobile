import React from 'react';
import { render } from '@testing-library/react-native';
import FadeOutOverlay from './';
jest.useFakeTimers();

describe('FadeOutOverlay', () => {
  it('should render correctly', () => {
    const wrapper = render(<FadeOutOverlay />);
    expect(wrapper).toMatchSnapshot();
  });
});
