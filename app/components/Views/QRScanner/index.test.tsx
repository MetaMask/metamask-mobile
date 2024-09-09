import React from 'react';

import renderWithProvider from '../../../util/test/renderWithProvider';
import QrScanner from './';
import { backgroundState } from '../../../util/test/initial-root-state';

const initialState = {
  engine: {
    backgroundState,
  },
};

describe('QrScanner', () => {
  it('should render correctly', () => {
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
