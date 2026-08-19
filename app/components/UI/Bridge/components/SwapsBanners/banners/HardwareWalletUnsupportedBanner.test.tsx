import React from 'react';
import { strings } from '../../../../../../../locales/i18n';
import { isHardwareAccount } from '../../../../../../util/address';
import { SwapsBannersSelectorsIDs } from '../SwapsBanners.testIds';
import { HardwareWalletUnsupportedBanner } from './HardwareWalletUnsupportedBanner';
import { renderBanner } from './testUtils';

jest.mock('../../../../../../util/address', () => ({
  ...jest.requireActual('../../../../../../util/address'),
  isHardwareAccount: jest.fn(),
}));

describe('HardwareWalletUnsupportedBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('tells hardware wallet users that this order type is unsupported', () => {
    jest.mocked(isHardwareAccount).mockReturnValue(true);

    const { getByText } = renderBanner(<HardwareWalletUnsupportedBanner />);

    expect(
      getByText(strings('bridge.hardware_wallet_not_supported')),
    ).toBeOnTheScreen();
  });

  it('is hidden for a software account', () => {
    jest.mocked(isHardwareAccount).mockReturnValue(false);

    const { queryByTestId } = renderBanner(<HardwareWalletUnsupportedBanner />);

    expect(
      queryByTestId(
        SwapsBannersSelectorsIDs.HARDWARE_WALLET_ORDER_TYPE_UNSUPPORTED,
      ),
    ).toBeNull();
  });
});
