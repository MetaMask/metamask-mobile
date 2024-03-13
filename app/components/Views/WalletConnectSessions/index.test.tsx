import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WalletConnectSessions from './';

describe('WalletConnectSessions', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <WalletConnectSessions navigation={{ setOptions: () => null }} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
