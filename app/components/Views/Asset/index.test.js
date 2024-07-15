import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import Asset from './';
import Engine from '../../../core/Engine';
import { MOCK_ACCOUNTS_CONTROLLER_STATE } from '../../../util/test/accountsControllerTestUtils';
import { hexStringToUint8Array } from '../../../util/hexUtils';

console.log('Starting Asset component test file');

const mockedEngine = Engine;

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
    },
  },
};

jest.mock('../../../core/Engine.ts', () => {
  const {
    MOCK_ADDRESS_1,
  } = require('../../../util/test/accountsControllerTestUtils');

  return {
    init: () => mockedEngine.init({}),
    context: {
      KeyringController: {
        getOrAddQRKeyring: async () => ({ subscribe: () => ({}) }),
        state: {
          keyrings: [
            {
              accounts: [MOCK_ADDRESS_1],
            },
          ],
        },
      },
    },
    controllerMessenger: {
      subscribe: jest.fn(),
    },
  };
});

describe('Asset', () => {
  beforeAll(() => {
    console.log('Setting up Asset component test suite');
  });

  it('should render correctly', () => {
    console.log('Beginning Asset component render test');
    const { toJSON } = renderWithProvider(
      <Asset
        navigation={{ setOptions: () => null }}
        route={{ params: { symbol: 'ETH', address: 'something', isETH: true } }}
        transactions={[]}
        selectedInternalAccount={{
          address: hexStringToUint8Array(
            '0x1234567890123456789012345678901234567890',
          ),
        }}
      />,
      {
        state: mockInitialState,
      },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
