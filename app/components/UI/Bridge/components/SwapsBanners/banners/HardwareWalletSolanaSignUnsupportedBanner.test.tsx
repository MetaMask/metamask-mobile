import React from 'react';
import { SolScope } from '@metamask/keyring-api';
import type { Hex } from '@metamask/utils';
import { strings } from '../../../../../../../locales/i18n';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../../util/address';
import { createBridgeTestState } from '../../../testUtils';
import type { BridgeToken } from '../../../types';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { HardwareWalletSolanaSignUnsupportedBanner } from './HardwareWalletSolanaSignUnsupportedBanner';

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

jest.mock('../../../../../../selectors/accountsController', () => ({
  ...jest.requireActual('../../../../../../selectors/accountsController'),
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
}));

const solanaToken: BridgeToken = {
  address: 'So11111111111111111111111111111111111111112',
  chainId: SolScope.Mainnet,
  decimals: 9,
  image: '',
  name: 'Solana',
  symbol: 'SOL',
};

const ethereumToken: BridgeToken = {
  address: '0x0000000000000000000000000000000000000000',
  chainId: '0x1' as Hex,
  decimals: 18,
  image: '',
  name: 'Ether',
  symbol: 'ETH',
};

// Rendered next to the confirm button rather than in the banner stack, so it
// works without the SwapsBanners container.
const renderHardwareWalletBanner = (sourceToken: BridgeToken) =>
  renderWithProvider(<HardwareWalletSolanaSignUnsupportedBanner />, {
    state: createBridgeTestState({
      bridgeReducerOverrides: { sourceAmount: '1', sourceToken },
    }),
  });

describe('HardwareWalletSolanaSignUnsupportedBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(selectSelectedInternalAccountFormattedAddress)
      .mockReturnValue('0x1234567890123456789012345678901234567890');
  });

  it('tells hardware wallet users that Solana swaps are unsupported', () => {
    jest.mocked(isHardwareAccount).mockReturnValue(true);

    const { getByText } = renderHardwareWalletBanner(solanaToken);

    expect(
      getByText(strings('bridge.hardware_wallet_not_supported_solana')),
    ).toBeOnTheScreen();
  });

  it('renders nothing for a software account swapping from Solana', () => {
    jest.mocked(isHardwareAccount).mockReturnValue(false);

    const { queryByTestId } = renderHardwareWalletBanner(solanaToken);

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.HARDWARE_WALLET_UNSUPPORTED),
    ).toBeNull();
  });

  it('renders nothing for a hardware wallet swapping from an EVM chain', () => {
    jest.mocked(isHardwareAccount).mockReturnValue(true);

    const { queryByTestId } = renderHardwareWalletBanner(ethereumToken);

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.HARDWARE_WALLET_UNSUPPORTED),
    ).toBeNull();
  });

  it('renders nothing while no account is selected', () => {
    jest
      .mocked(selectSelectedInternalAccountFormattedAddress)
      .mockReturnValue(undefined);

    const { queryByTestId } = renderHardwareWalletBanner(solanaToken);

    expect(
      queryByTestId(SwapsBannersSelectorsIDs.HARDWARE_WALLET_UNSUPPORTED),
    ).toBeNull();
  });
});
