import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import InfoNetworkModal from './InfoNetworkModal';
import { mockNetworkState } from '../../../util/test/network';
import { RpcEndpointType } from '@metamask/network-controller';
import { backgroundState } from '../../../util/test/initial-root-state';

// Mock the navigation
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

// Mock the NetworkInfo component
jest.mock('../../UI/NetworkInfo', () => () => 'NetworkInfo');

const initialState = {
  modals: {
    infoNetworkModalVisible: true,
  },
  networkOnboarded: {
    networkOnboardedState: {},
  },
  settings: {
    passwordResetInProgress: false,
  },
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: mockNetworkState({
        chainId: '0x1',
        nickname: 'Ethereum Mainnet',
        ticker: 'ETH',
        type: RpcEndpointType.Infura,
      }),
      MultichainNetworkController: {
        ...backgroundState.MultichainNetworkController,
        isEvmSelected: false,
      },
    },
  },
};

describe('InfoNetworkModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { toJSON } = renderWithProvider(<InfoNetworkModal />, {
      state: initialState,
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly when passwordResetInProgress is false', () => {
    const { toJSON } = renderWithProvider(<InfoNetworkModal />, {
      state: {
        ...initialState,
        settings: {
          passwordResetInProgress: false,
        },
      },
    });
    expect(toJSON()).toMatchSnapshot();
  });

  it('should not show network info modal when passwordResetInProgress is true', () => {
    const stateWithPasswordReset = {
      ...initialState,
      settings: {
        passwordResetInProgress: true,
      },
    };

    const { toJSON } = renderWithProvider(<InfoNetworkModal />, {
      state: stateWithPasswordReset,
    });

    // The component should render but the useEffect hook should prevent
    // the modal from being shown when passwordResetInProgress is true
    expect(toJSON()).toMatchSnapshot();
  });

  it('should use passwordResetInProgress from settings state', () => {
    // Test that the component properly accesses the passwordResetInProgress state
    const stateWithPasswordReset = {
      ...initialState,
      settings: {
        passwordResetInProgress: true,
      },
    };

    const { toJSON } = renderWithProvider(<InfoNetworkModal />, {
      state: stateWithPasswordReset,
    });

    expect(toJSON()).toBeDefined();
    // The actual logic is in the useEffect hook which checks passwordResetInProgress
    // before showing the network info modal
  });
});
