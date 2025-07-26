import React from 'react';

import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import Asset from '../../components/send/asset';
import { SendContextProvider, useSendContext } from './send-context';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: jest.fn(),
    navigate: jest.fn(),
  }),
  useRoute: jest.fn().mockReturnValue({
    params: {
      asset: {
        chainId: '0x1',
        name: 'Ethereum',
        address: '0x123',
      },
    },
  }),
}));

describe('SendContext', () => {
  it('should pass correct asset to child components', () => {
    const { getByText } = renderWithProvider(
      <SendContextProvider>
        <Asset />
      </SendContextProvider>,
      {
        state: {
          engine: {
            backgroundState,
          },
        },
      },
    );
    expect(getByText('Asset: 0x123')).toBeTruthy();
  });
});

describe('useSendContext', () => {
  it('should throw error is not wrapped in SendContext', () => {
    expect(() => {
      useSendContext();
    }).toThrow();
  });
});
