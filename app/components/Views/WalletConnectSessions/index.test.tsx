import React from 'react';
import { render } from '@testing-library/react-native';
import WalletConnectSessions from './';

describe('WalletConnectSessions', () => {
  it('should render correctly', () => {
    const { toJSON } = render(
      <WalletConnectSessions navigation={{ setOptions: () => null }} />,
    );

    expect(toJSON()).toMatchSnapshot();
  });
});
