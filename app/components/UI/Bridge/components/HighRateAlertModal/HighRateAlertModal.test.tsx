import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { Hex } from '@metamask/utils';
import { HighRateAlertModal } from './index';
import { HighRateAlertModalSelectorsIDs } from './HighRateAlertModal.testIds';
import { BridgeToken } from '../../types';

const mockGoToSwaps = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: jest.fn() }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
}));

jest.mock('../../hooks/useSwapBridgeNavigation', () => ({
  SwapBridgeNavigationLocation: { MainView: 'MainView' },
  useSwapBridgeNavigation: () => ({ goToSwaps: mockGoToSwaps }),
}));

import { useParams } from '../../../../../util/navigation/navUtils';

const mockUseParams = useParams as jest.MockedFunction<typeof useParams>;

const sourceToken: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ONE',
  name: 'One Token',
};

const destToken: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
  name: 'USD Coin',
};

describe('HighRateAlertModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({ sourceToken, destToken });
  });

  it('renders the alert content and redirects to regular swaps', () => {
    const { getByTestId, getByText } = render(<HighRateAlertModal />);

    expect(getByTestId(HighRateAlertModalSelectorsIDs.SHEET)).toBeOnTheScreen();
    expect(getByText('High rate alert')).toBeOnTheScreen();
    expect(
      getByText(
        'Batch selling one token could lead to a higher rate. Want to do a swap instead?',
      ),
    ).toBeOnTheScreen();

    fireEvent.press(
      getByTestId(HighRateAlertModalSelectorsIDs.SWAP_INSTEAD_BUTTON),
    );

    expect(mockGoToSwaps).toHaveBeenCalledWith(sourceToken, destToken);
  });
});
