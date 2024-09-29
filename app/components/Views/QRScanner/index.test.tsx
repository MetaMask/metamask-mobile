import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';
import QrScanner from './';
import { backgroundState } from '../../../util/test/initial-root-state';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('QrScanner', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(
      <QrScanner
        onScanSuccess={() => {
          //unused
        }}
      />,
      { state: initialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
