import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsWatchOnlyBanner from './PerpsWatchOnlyBanner';
import {
  selectIsSelectedAccountWatchOnly,
  selectSelectedAccountGroupEvmInternalAccount,
} from '../../../../../selectors/multichainAccounts/accountTreeController';
import { WatchOnlySession } from '../../../../../core/WatchOnly/WatchOnlySession';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import { formatAddress } from '../../../../../util/address';
import { PerpsWatchOnlySelectorsIDs } from '../../Perps.testIds';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../../core/WatchOnly/WatchOnlySession', () => ({
  WatchOnlySession: {
    stop: jest.fn(),
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const { useSelector } = jest.requireMock('react-redux');

const WATCHED_ACCOUNT = {
  address: '0x1234567890123456789012345678901234567890',
};

function mockSelectors({
  isWatchOnly,
  account,
}: {
  isWatchOnly: boolean;
  account: typeof WATCHED_ACCOUNT | null;
}) {
  useSelector.mockImplementation((selector: unknown) => {
    if (selector === selectIsSelectedAccountWatchOnly) {
      return isWatchOnly;
    }
    if (selector === selectSelectedAccountGroupEvmInternalAccount) {
      return account;
    }
    return undefined;
  });
}

describe('PerpsWatchOnlyBanner', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders null when the account is not watch-only', () => {
    mockSelectors({ isWatchOnly: false, account: WATCHED_ACCOUNT });

    const { queryByTestId } = render(<PerpsWatchOnlyBanner />);

    expect(
      queryByTestId(PerpsWatchOnlySelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('renders null when there is no selected account', () => {
    mockSelectors({ isWatchOnly: true, account: null });

    const { queryByTestId } = render(<PerpsWatchOnlyBanner />);

    expect(
      queryByTestId(PerpsWatchOnlySelectorsIDs.BANNER),
    ).not.toBeOnTheScreen();
  });

  it('renders the watched address when the account is watch-only', () => {
    mockSelectors({ isWatchOnly: true, account: WATCHED_ACCOUNT });

    const { getByTestId, getByText } = render(<PerpsWatchOnlyBanner />);

    expect(getByTestId(PerpsWatchOnlySelectorsIDs.BANNER)).toBeOnTheScreen();
    expect(
      getByText(
        strings('perps.watch_only.description', {
          address: formatAddress(WATCHED_ACCOUNT.address, 'short'),
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('stops the watch-only session when switch back is pressed', () => {
    mockSelectors({ isWatchOnly: true, account: WATCHED_ACCOUNT });
    (WatchOnlySession.stop as jest.Mock).mockResolvedValue({
      active: false,
      address: null,
    });

    const { getByTestId } = render(<PerpsWatchOnlyBanner />);

    fireEvent.press(getByTestId(PerpsWatchOnlySelectorsIDs.SWITCH_BACK_BUTTON));

    expect(WatchOnlySession.stop).toHaveBeenCalledTimes(1);
  });

  it('logs an error when stopping the session fails', async () => {
    mockSelectors({ isWatchOnly: true, account: WATCHED_ACCOUNT });
    const stopError = new Error('failed to stop');
    (WatchOnlySession.stop as jest.Mock).mockRejectedValue(stopError);

    const { getByTestId } = render(<PerpsWatchOnlyBanner />);

    fireEvent.press(getByTestId(PerpsWatchOnlySelectorsIDs.SWITCH_BACK_BUTTON));

    await waitFor(() =>
      expect(Logger.error).toHaveBeenCalledWith(
        stopError,
        expect.objectContaining({
          tags: expect.objectContaining({
            component: 'PerpsWatchOnlyBanner',
            action: 'watch_only_switch_back',
          }),
        }),
      ),
    );
  });

  it('normalizes a non-Error rejection before logging it', async () => {
    mockSelectors({ isWatchOnly: true, account: WATCHED_ACCOUNT });
    (WatchOnlySession.stop as jest.Mock).mockRejectedValue('keyring busy');

    const { getByTestId } = render(<PerpsWatchOnlyBanner />);

    fireEvent.press(getByTestId(PerpsWatchOnlySelectorsIDs.SWITCH_BACK_BUTTON));

    await waitFor(() =>
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          context: expect.objectContaining({ name: 'PerpsWatchOnlyBanner' }),
        }),
      ),
    );
  });
});
