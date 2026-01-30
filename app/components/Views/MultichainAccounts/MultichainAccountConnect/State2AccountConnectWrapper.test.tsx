import React from 'react';
import renderWithProvider, {
  DeepPartial,
} from '../../../../util/test/renderWithProvider';
import { State2AccountConnectWrapper } from './State2AccountConnectWrapper';
import { AccountConnectProps } from '../../AccountConnect/AccountConnect.types';
import { RootState } from '../../../../reducers';
import {
  Caip25EndowmentPermissionName,
  Caip25CaveatType,
  Caip25CaveatValue,
} from '@metamask/chain-agnostic-permission';

const TEST_IDS = {
  ACCOUNT_CONNECT_COMPONENT: 'account-connect-component',
  MULTICHAIN_ACCOUNT_CONNECT_COMPONENT: 'multichain-account-connect-component',
} as const;

const mockUseRoute = jest.fn();

// Mock useRoute
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useRoute: () => mockUseRoute(),
  };
});

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

const mockRouteParams = {
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
};

const createMockState = (isState2Enabled: boolean): DeepPartial<RootState> => ({
  engine: {
    backgroundState: {
      RemoteFeatureFlagController: {
        remoteFeatureFlags: {
          enableMultichainAccounts: {
            enabled: !isState2Enabled,
            featureVersion: '1',
            minimumVersion: '0.0.0', // Use a very low version to ensure it passes
          },
          enableMultichainAccountsState2: {
            enabled: isState2Enabled,
            featureVersion: '2',
            minimumVersion: '0.0.0', // Use a very low version to ensure it passes
          },
        },
        cacheTimestamp: 0,
      },
    },
  },
});

describe('State2AccountConnectWrapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when multichain accounts state 2 is enabled', () => {
    it('renders MultichainAccountConnect component', () => {
      const isState2Enabled = true;
      const mockState = createMockState(isState2Enabled);

      mockUseRoute.mockReturnValue({ params: mockRouteParams });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <State2AccountConnectWrapper />,
        { state: mockState },
      );

      expect(
        getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT),
      ).toBeTruthy();
      expect(queryByTestId(TEST_IDS.ACCOUNT_CONNECT_COMPONENT)).toBeNull();
    });

    it('forwards all props to MultichainAccountConnect', () => {
      const isState2Enabled = true;
      const mockState = createMockState(isState2Enabled);
      const customRouteParams = {
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
      };

      mockUseRoute.mockReturnValue({ params: customRouteParams });

      const { getByTestId } = renderWithProvider(
        <State2AccountConnectWrapper />,
        { state: mockState },
      );

      const multichainComponent = getByTestId(
        TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT,
      );
      expect(multichainComponent).toBeTruthy();
      expect(multichainComponent.props.children).toContain(
        'custom-permission-id',
      );
    });
  });

  describe('when multichain accounts state 2 is disabled', () => {
    it('renders AccountConnect component', () => {
      const isState2Enabled = false;
      const mockState = createMockState(isState2Enabled);

      mockUseRoute.mockReturnValue({ params: mockRouteParams });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <State2AccountConnectWrapper />,
        { state: mockState },
      );

      expect(getByTestId(TEST_IDS.ACCOUNT_CONNECT_COMPONENT)).toBeTruthy();
      expect(
        queryByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT),
      ).toBeNull();
    });

    it('forwards all props to AccountConnect', () => {
      const isState2Enabled = false;
      const mockState = createMockState(isState2Enabled);
      const customRouteParams = {
        hostInfo: {
          metadata: {
            id: 'legacy-id',
            origin: 'legacy-origin.com',
            isEip1193Request: true,
          },
          permissions: createMockCaip25Permission({
            'wallet:eip155': {
              accounts: ['eip155:1:0x456'],
            },
          }),
        },
        permissionRequestId: 'legacy-permission-id',
      };

      mockUseRoute.mockReturnValue({ params: customRouteParams });

      const { getByTestId } = renderWithProvider(
        <State2AccountConnectWrapper />,
        { state: mockState },
      );

      const accountConnectComponent = getByTestId(
        TEST_IDS.ACCOUNT_CONNECT_COMPONENT,
      );
      expect(accountConnectComponent).toBeTruthy();
      expect(accountConnectComponent.props.children).toContain(
        'legacy-permission-id',
      );
    });
  });

  describe('feature flag behavior', () => {
    it('uses feature flag selector to determine component rendering', () => {
      const state2MockState = createMockState(true);

      mockUseRoute.mockReturnValue({ params: mockRouteParams });

      const { getByTestId: getByTestIdState2 } = renderWithProvider(
        <State2AccountConnectWrapper />,
        { state: state2MockState },
      );

      expect(
        getByTestIdState2(TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT),
      ).toBeTruthy();

      const state1MockState = createMockState(false);

      const { getByTestId: getByTestIdState1 } = renderWithProvider(
        <State2AccountConnectWrapper />,
        { state: state1MockState },
      );

      expect(
        getByTestIdState1(TEST_IDS.ACCOUNT_CONNECT_COMPONENT),
      ).toBeTruthy();
    });
  });

  it('handles props with minimal metadata when state 2 is enabled', () => {
    const mockState = createMockState(true);
    const minimalRouteParams = {
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
    };

    mockUseRoute.mockReturnValue({ params: minimalRouteParams });

    const { getByTestId } = renderWithProvider(
      <State2AccountConnectWrapper />,
      { state: mockState },
    );

    expect(
      getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT),
    ).toBeTruthy();
  });

  it('handles props with complex permissions when state 2 is disabled', () => {
    const mockState = createMockState(false);
    const complexRouteParams = {
      hostInfo: {
        metadata: {
          id: 'complex-id',
          origin: 'complex.dapp.com',
          isEip1193Request: true,
          promptToCreateSolanaAccount: true,
        },
        permissions: createMockCaip25Permission({
          'eip155:1': { accounts: ['eip155:1:0x123'] },
          'eip155:137': { accounts: ['eip155:137:0x456'] },
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': {
            accounts: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp:abc123'],
          },
        }),
      },
      permissionRequestId: 'complex-request',
    };

    mockUseRoute.mockReturnValue({ params: complexRouteParams });

    const { getByTestId } = renderWithProvider(
      <State2AccountConnectWrapper />,
      { state: mockState },
    );

    expect(getByTestId(TEST_IDS.ACCOUNT_CONNECT_COMPONENT)).toBeTruthy();
  });

  describe('edge cases', () => {
    it('handles missing feature flag gracefully', () => {
      const mockStateWithoutFlag: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {},
              cacheTimestamp: 0,
            },
          },
        },
      };

      mockUseRoute.mockReturnValue({ params: mockRouteParams });

      const { getByTestId, queryByTestId } = renderWithProvider(
        <State2AccountConnectWrapper />,
        { state: mockStateWithoutFlag },
      );

      expect(
        getByTestId(TEST_IDS.MULTICHAIN_ACCOUNT_CONNECT_COMPONENT),
      ).toBeTruthy();
      expect(queryByTestId(TEST_IDS.ACCOUNT_CONNECT_COMPONENT)).toBeNull();
    });

    it('handles feature flag with version 1 correctly', () => {
      const mockStateVersion1: DeepPartial<RootState> = {
        engine: {
          backgroundState: {
            RemoteFeatureFlagController: {
              remoteFeatureFlags: {
                enableMultichainAccounts: {
                  enabled: true,
                  featureVersion: '1',
                  minimumVersion: '0.0.0',
                },
                enableMultichainAccountsState2: {
                  enabled: false,
                  featureVersion: null,
                  minimumVersion: null,
                },
              },
              cacheTimestamp: 0,
            },
          },
        },
      };

      mockUseRoute.mockReturnValue({ params: mockRouteParams });

      const { getByTestId } = renderWithProvider(
        <State2AccountConnectWrapper />,
        { state: mockStateVersion1 },
      );

      expect(getByTestId(TEST_IDS.ACCOUNT_CONNECT_COMPONENT)).toBeTruthy();
    });
  });
});
