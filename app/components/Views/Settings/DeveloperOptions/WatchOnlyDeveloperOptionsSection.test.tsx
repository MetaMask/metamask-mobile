import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import WatchOnlyDeveloperOptionsSection from './WatchOnlyDeveloperOptionsSection';
import { strings } from '../../../../../locales/i18n';
import { selectWatchOnlyKeyringAddress } from '../../../../selectors/keyringController';
import { WatchOnlySession } from '../../../../core/WatchOnly/WatchOnlySession';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('../../../../core/WatchOnly/WatchOnlySession', () => ({
  WatchOnlySession: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

const mockUseSelector = jest.mocked(useSelector);

const WATCHED_ADDRESS = '0x1234567890123456789012345678901234567890';

function mockSelectors({
  isWatchOnly,
  address,
}: {
  isWatchOnly: boolean;
  address?: string;
}) {
  // The section reads the watch-only keyring, not the selected account, so a
  // session stays stoppable after the user switches to another account.
  mockUseSelector.mockImplementation((selector: unknown) =>
    selector === selectWatchOnlyKeyringAddress && isWatchOnly
      ? address
      : undefined,
  );
}

describe('WatchOnlyDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectors({ isWatchOnly: false });
  });

  it('renders the default description when no account is watched', () => {
    const { getByText } = render(<WatchOnlyDeveloperOptionsSection />);

    expect(
      getByText(
        strings('app_settings.developer_options.watch_only.description'),
      ),
    ).toBeOnTheScreen();
  });

  it('renders the watched address when an account is watched', () => {
    mockSelectors({ isWatchOnly: true, address: WATCHED_ADDRESS });

    const { getByText } = render(<WatchOnlyDeveloperOptionsSection />);

    expect(
      getByText(
        strings('app_settings.developer_options.watch_only.active', {
          address: WATCHED_ADDRESS,
        }),
      ),
    ).toBeOnTheScreen();
  });

  it('disables the start button until an address is entered', () => {
    const { getByTestId } = render(<WatchOnlyDeveloperOptionsSection />);

    expect(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_START_BUTTON),
    ).toBeDisabled();
  });

  it('starts a watch-only session with the trimmed address', () => {
    (WatchOnlySession.start as jest.Mock).mockResolvedValue({
      active: true,
      address: WATCHED_ADDRESS,
    });

    const { getByTestId } = render(<WatchOnlyDeveloperOptionsSection />);

    fireEvent.changeText(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
      `  ${WATCHED_ADDRESS}  `,
    );
    fireEvent.press(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_START_BUTTON),
    );

    expect(WatchOnlySession.start).toHaveBeenCalledWith(WATCHED_ADDRESS);
  });

  it('displays an error message when starting a session fails', async () => {
    (WatchOnlySession.start as jest.Mock).mockRejectedValue(
      new Error('Invalid EVM address: bad-address'),
    );

    const { getByTestId, findByText } = render(
      <WatchOnlyDeveloperOptionsSection />,
    );

    fireEvent.changeText(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
      'bad-address',
    );
    fireEvent.press(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_START_BUTTON),
    );

    expect(
      await findByText('Invalid EVM address: bad-address'),
    ).toBeOnTheScreen();
  });

  it('disables the stop button when no account is watched', () => {
    const { getByTestId } = render(<WatchOnlyDeveloperOptionsSection />);

    expect(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_STOP_BUTTON),
    ).toBeDisabled();
  });

  it('stops the watch-only session when an account is watched', () => {
    mockSelectors({ isWatchOnly: true, address: WATCHED_ADDRESS });
    (WatchOnlySession.stop as jest.Mock).mockResolvedValue({
      active: false,
      address: null,
    });

    const { getByTestId } = render(<WatchOnlyDeveloperOptionsSection />);

    fireEvent.press(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_STOP_BUTTON),
    );

    expect(WatchOnlySession.stop).toHaveBeenCalledTimes(1);
  });
});
