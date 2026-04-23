import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { MissingPriceModal } from './index';
import { useParams } from '../../../../../util/navigation/navUtils';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { useBridgeConfirm } from '../../hooks/useBridgeConfirm';
import { useSelector } from 'react-redux';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
import { strings } from '../../../../../../locales/i18n';
import { Hex } from '@metamask/utils';

jest.mock('@metamask/design-system-react-native', () => {
  const ReactModule = jest.requireActual('react');
  const actualModule = jest.requireActual(
    '@metamask/design-system-react-native',
  );
  const { View } = jest.requireActual('react-native');

  const BottomSheet = ReactModule.forwardRef(
    (
      props: {
        children?: React.ReactNode;
        goBack?: () => void;
      },
      ref: React.Ref<unknown>,
    ) => {
      ReactModule.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: () => props.goBack?.(),
      }));

      return ReactModule.createElement(
        View,
        { testID: 'bottom-sheet' },
        props.children,
      );
    },
  );

  return {
    ...actualModule,
    BottomSheet,
  };
});

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useLatestBalance', () => ({
  useLatestBalance: jest.fn().mockReturnValue(undefined),
}));

jest.mock('../../hooks/useBridgeConfirm', () => ({
  useBridgeConfirm: jest.fn(),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn() }),
}));

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;
const mockUseLatestBalance = useLatestBalance as jest.MockedFunction<
  typeof useLatestBalance
>;
const mockUseBridgeConfirm = useBridgeConfirm as jest.MockedFunction<
  typeof useBridgeConfirm
>;
const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;

const mockConfirmBridge = jest.fn();

const mockSourceToken = {
  address: '0xabc',
  decimals: 18,
  chainId: '0x1' as Hex,
  symbol: 'ETH',
  name: 'Ether',
  image: '',
};

const renderModal = () =>
  renderWithProvider(<MissingPriceModal />, {
    state: {},
  });

describe('MissingPriceModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      location: MetaMetricsSwapsEventSource.MainView,
    });
    mockUseLatestBalance.mockReturnValue(undefined);
    mockUseBridgeConfirm.mockReturnValue(mockConfirmBridge);
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSourceToken) {
        return mockSourceToken;
      }

      return undefined;
    });
  });

  it('renders the missing price title and description', () => {
    const { getByText } = renderModal();

    expect(
      getByText(strings('swaps.market_price_unavailable_title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('swaps.market_price_unavailable')),
    ).toBeOnTheScreen();
  });

  it('shows Proceed and Cancel buttons', () => {
    const { getByText } = renderModal();

    expect(getByText(strings('bridge.proceed'))).toBeOnTheScreen();
    expect(getByText(strings('bridge.cancel'))).toBeOnTheScreen();
  });

  it('does not call confirmBridge when Cancel is pressed', () => {
    const { getByTestId } = renderModal();

    fireEvent.press(getByTestId('footer-primary-button'));

    expect(mockConfirmBridge).not.toHaveBeenCalled();
  });

  it('calls confirmBridge when Proceed is pressed', async () => {
    const { getByTestId } = renderModal();

    fireEvent.press(getByTestId('footer-secondary-button'));

    await waitFor(() => {
      expect(mockConfirmBridge).toHaveBeenCalledTimes(1);
    });
  });
});
