import React from 'react';
import ChoosePassword from '../ChoosePassword';
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

describe('ChoosePassword', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<ChoosePassword />, {
      state: initialState,
    }, false);
    expect(toJSON()).toMatchSnapshot();
  });
});
