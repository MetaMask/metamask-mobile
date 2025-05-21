import React from 'react';
import ResetPassword from './';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';

const initialState = {
  user: {
    passwordSet: true,
    seedphraseBackedUp: false,
  },
  engine: {
    backgroundState,
  },
};

describe('ResetPassword', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<ResetPassword />, {
      state: initialState,
    }, false);
    expect(toJSON()).toMatchSnapshot();
  });
});
