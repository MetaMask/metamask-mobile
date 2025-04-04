import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import FadeOutOverlay from './';
jest.useFakeTimers();

describe('FadeOutOverlay', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<FadeOutOverlay />);
    expect(toJSON()).toMatchSnapshot();
  });
});
