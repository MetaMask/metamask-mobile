import React from 'react';
import TransactionReviewEIP1559 from './';
import renderWithProvider from '../../../..//util/test/renderWithProvider';
import initialBackgroundState from '../../../../util/test/initial-background-state.json';

const initialState = {
  engine: {
    backgroundState: initialBackgroundState,
  },
};

describe('TransactionReviewEIP1559', () => {
  it('should match snapshot', async () => {
    const container = renderWithProvider(<TransactionReviewEIP1559 />, {
      state: initialState,
    });
    expect(container).toMatchSnapshot();
  });
});
