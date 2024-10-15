import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import ConfirmationFooter from './ConfirmationFooter';

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: jest.fn(),
  };
});

describe('ConfirmationFooter', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(<ConfirmationFooter />);

    expect(toJSON()).toMatchSnapshot();
  });
});
