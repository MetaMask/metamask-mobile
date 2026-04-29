import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import GlobalAlert from './';

const initialState = {
  alert: {
    isVisible: true,
    autodismiss: null,
    content: null,
    data: null,
  },
};

describe('GlobalAlert', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<GlobalAlert />, {
      state: initialState,
    });
    expect(toJSON()).not.toBeNull();
  });
});
