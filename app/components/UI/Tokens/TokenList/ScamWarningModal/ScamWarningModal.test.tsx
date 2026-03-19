import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { ScamWarningModal } from './ScamWarningModal';
import Routes from '../../../../../constants/navigation/Routes';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      background: { default: '#fff' },
      border: { muted: '#ccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
    },
  }),
}));

jest.mock(
  '../../../../../component-library/components/Sheet/SheetHeader',
  () => {
    /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
    const ReactMock = require('react');
    return {
      __esModule: true,
      default: ({ title }: { title: string }) =>
        ReactMock.createElement(
          'View',
          { testID: 'sheet-header' },
          ReactMock.createElement('Text', {}, title),
        ),
    };
  },
);

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      ReactMock.createElement('Text', props),
  };
});

jest.mock('../../../../../component-library/components/Buttons/Button', () => {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  return {
    __esModule: true,
    default: ({ label, onPress, testID }: Record<string, unknown>) =>
      ReactMock.createElement(
        'View',
        {
          testID: testID ?? 'edit-network-button',
          onPress,
        },
        ReactMock.createElement('Text', {}, label),
      ),
    ButtonVariants: { Secondary: 'Secondary' },
    ButtonSize: { Lg: 'Lg' },
  };
});

jest.mock('react-native-modal', () => {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  return {
    __esModule: true,
    default: ({
      isVisible,
      children,
      onBackdropPress,
      onSwipeComplete,
    }: Record<string, unknown>) =>
      isVisible
        ? ReactMock.createElement(
            'View',
            {
              testID: 'modal',
              onBackdropPress,
              onSwipeComplete,
            },
            children,
          )
        : null,
  };
});

jest.mock('../../../Ramp/Aggregator/components/Box', () => {
  /* eslint-disable @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports */
  const ReactMock = require('react');
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) =>
      ReactMock.createElement('View', props),
  };
});

const mockNavigate = jest.fn();
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const networkConfigurations: Record<string, unknown> = {
  '0x1': {
    chainId: '0x1',
    name: 'Ethereum Mainnet',
    nativeCurrency: 'ETH',
    defaultRpcEndpointIndex: 0,
    rpcEndpoints: [
      { networkClientId: 'mainnet-client', url: 'https://mainnet.infura.io' },
    ],
  },
  '0x89': {
    chainId: '0x89',
    name: 'Polygon',
    nativeCurrency: 'MATIC',
    defaultRpcEndpointIndex: 0,
    rpcEndpoints: [
      { networkClientId: 'polygon-client', url: 'https://polygon-rpc.com' },
    ],
  },
};

describe('ScamWarningModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue({ navigate: mockNavigate });
    mockUseSelector.mockReturnValue(networkConfigurations);
  });

  it('does not render modal when showScamWarningModal is null', () => {
    const setShowScamWarningModal = jest.fn();

    const { queryByTestId } = render(
      <ScamWarningModal
        showScamWarningModal={null}
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    expect(queryByTestId('modal')).toBeNull();
  });

  it('renders modal when showScamWarningModal is a chain ID', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByTestId } = render(
      <ScamWarningModal
        showScamWarningModal="0x1"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    expect(getByTestId('modal')).toBeTruthy();
  });

  it('displays the native currency ticker in the warning text', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByText } = render(
      <ScamWarningModal
        showScamWarningModal="0x1"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    expect(getByText(/ETH/)).toBeTruthy();
  });

  it('displays empty string when network config is not found', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByTestId } = render(
      <ScamWarningModal
        showScamWarningModal="0xDEAD"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    expect(getByTestId('modal')).toBeTruthy();
  });

  it('calls setShowScamWarningModal(null) on backdrop press', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByTestId } = render(
      <ScamWarningModal
        showScamWarningModal="0x1"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    const modal = getByTestId('modal');
    fireEvent(modal, 'onBackdropPress');

    expect(setShowScamWarningModal).toHaveBeenCalledWith(null);
  });

  it('calls setShowScamWarningModal(null) on swipe complete', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByTestId } = render(
      <ScamWarningModal
        showScamWarningModal="0x1"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    const modal = getByTestId('modal');
    fireEvent(modal, 'onSwipeComplete');

    expect(setShowScamWarningModal).toHaveBeenCalledWith(null);
  });

  it('navigates to ADD_NETWORK and closes modal on edit button press', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByTestId } = render(
      <ScamWarningModal
        showScamWarningModal="0x1"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    fireEvent.press(getByTestId('edit-network-button'));

    expect(setShowScamWarningModal).toHaveBeenCalledWith(null);
    expect(mockNavigate).toHaveBeenCalledWith(Routes.ADD_NETWORK, {
      network: 'mainnet-client',
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  });

  it('does not navigate when networkConfig is undefined', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByTestId } = render(
      <ScamWarningModal
        showScamWarningModal="0xDEAD"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    fireEvent.press(getByTestId('edit-network-button'));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(setShowScamWarningModal).not.toHaveBeenCalled();
  });

  it('does not navigate when rpcEndpoints has no default endpoint', () => {
    const setShowScamWarningModal = jest.fn();
    const emptyEndpointsConfig = {
      ...networkConfigurations,
      '0xBAD': {
        chainId: '0xBAD',
        name: 'Bad Network',
        nativeCurrency: 'BAD',
        defaultRpcEndpointIndex: 5,
        rpcEndpoints: [],
      },
    };
    mockUseSelector.mockReturnValue(emptyEndpointsConfig);

    const { getByTestId } = render(
      <ScamWarningModal
        showScamWarningModal="0xBAD"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    fireEvent.press(getByTestId('edit-network-button'));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(setShowScamWarningModal).not.toHaveBeenCalled();
  });

  it('uses correct network for different chain IDs', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByTestId, getByText } = render(
      <ScamWarningModal
        showScamWarningModal="0x89"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    expect(getByText(/MATIC/)).toBeTruthy();

    fireEvent.press(getByTestId('edit-network-button'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.ADD_NETWORK, {
      network: 'polygon-client',
      shouldNetworkSwitchPopToWallet: false,
      shouldShowPopularNetworks: false,
    });
  });

  it('displays ticker as empty when showScamWarningModal matches no config', () => {
    const setShowScamWarningModal = jest.fn();

    const { getByText } = render(
      <ScamWarningModal
        showScamWarningModal="0xNONE"
        setShowScamWarningModal={setShowScamWarningModal}
      />,
    );

    expect(getByText(/ ,/)).toBeTruthy();
  });
});
