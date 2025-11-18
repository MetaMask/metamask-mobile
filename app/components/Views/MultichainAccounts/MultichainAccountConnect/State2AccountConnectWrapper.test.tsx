import React from 'react';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { State2AccountConnectWrapper } from './State2AccountConnectWrapper';
import { AccountConnectProps } from '../../AccountConnect/AccountConnect.types';
import {
  Caip25EndowmentPermissionName,
  Caip25CaveatType,
  Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';

const TEST_IDS = {
  ACCOUNT_CONNECT_COMPONENT: 'account-connect-component',
  MULTICHAIN_ACCOUNT_CONNECT_COMPONENT: 'multichain-account-connect-component',
} as const;

// Mock the child components
jest.mock('../../AccountConnect/AccountConnect', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const actualReact = require('react');
  const MockAccountConnect = ({ route }: AccountConnectProps) =>
    actualReact.createElement(
      'div',
      { testID: TEST_IDS.ACCOUNT_CONNECT_COMPONENT },
      ['AccountConnect - ', route.params.permissionRequestId],
    );
  MockAccountConnect.displayName = 'AccountConnect';
  return MockAccountConnect;
});

jest.mock('./MultichainAccountConnect', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
  const actualReact = require('react');
  const MockMultichainAccountConnect = ({ route }: AccountConnectProps) =>
    actualReact.createElement(
      'div',
      { testID: TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT },
      ['MultichainAccountConnect - ', route.params.permissionRequestId],
    );
  MockMultichainAccountConnect.displayName = 'MultichainAccountConnect';
  return MockMultichainAccountConnect;
});

const createMockCaip25Permission = (
  optionalScopes: Record<string, { accounts: string[] }>,
) => ({
  [Caip25EndowmentPermissionName]: {
    parentCapability: Caip25EndowmentPermissionName,
    caveats: [
      {
        type: Caip25CaveatType,
        value: {
          requiredScopes: {},
          optionalScopes,
          isMultichainOrigin: false,
          sessionProperties: {},
        },
      },
    ] as [{ type: string; value: Caip25CaveatValue }],
  },
});

const mockProps: AccountConnectProps = {
  route: {
    params: {
      hostInfo: {
        metadata: {
          id: 'test-id',
          origin: 'test-origin.com',
          isEip1193Request: true,
        },
        permissions: createMockCaip25Permission({
          'wallet:eip155': {
            accounts: [],
          },
        }),
      },
      permissionRequestId: 'test-permission-request-id',
    },
  },
};

describe('State2AccountConnectWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders MultichainAccountConnect component', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <State2AccountConnectWrapper {...mockProps} />,
    );

    expect(
      getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT),
    ).toBeTruthy();
    expect(queryByTestId(TEST_IDS.ACCOUNT_CONNECT_COMPONENT)).toBeNull();
  });

  it('forwards all props to MultichainAccountConnect', () => {
    const customProps: AccountConnectProps = {
      route: {
        params: {
          hostInfo: {
            metadata: {
              id: 'custom-id',
              origin: 'custom-origin.com',
              isEip1193Request: false,
            },
            permissions: createMockCaip25Permission({
              'eip155:1': {
                accounts: ['eip155:1:0x123'],
              },
            }),
          },
          permissionRequestId: 'custom-permission-id',
        },
      },
    };

    const { getByTestId } = renderWithProvider(
      <State2AccountConnectWrapper {...customProps} />,
    );

    const multichainComponent = getByTestId(
      TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT,
    );
    expect(multichainComponent).toBeTruthy();
    expect(multichainComponent.props.children).toContain(
      'custom-permission-id',
    );
  });

  const minimalProps: AccountConnectProps = {
    route: {
      params: {
        hostInfo: {
          metadata: {
            id: 'minimal-id',
            origin: 'minimal.com',
          },
          permissions: createMockCaip25Permission({
            'wallet:eip155': { accounts: [] },
          }),
        },
        permissionRequestId: 'minimal-request',
      },
    },
  };

  const { getByTestId } = renderWithProvider(
    <State2AccountConnectWrapper {...minimalProps} />,
  );

  expect(
    getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT),
  ).toBeTruthy();
});
