import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import Logger from '../../../../util/Logger';
import WatchOnlyDeveloperOptionsSection from './WatchOnlyDeveloperOptionsSection';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';
import { strings } from '../../../../../locales/i18n';

const mockCreateAccount = jest.fn();
const mockSelectAccount = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    WatchOnlyAccountService: {
      createAccount: (address: string) => mockCreateAccount(address),
    },
    AccountTreeController: {
      setSelectedAccountGroupByAccountId: (id: string) => mockSelectAccount(id),
      getAccountContext: () => ({ groupId: 'keyring:watch-only/watch-id' }),
      getAccountGroupObject: () => ({
        metadata: { name: 'Watch-only Account 1' },
      }),
    },
  },
}));
jest.mock('../../../../util/Logger', () => ({ error: jest.fn() }));

const ADDRESS = '0x5972698398d8c5bbe67c0db74906236691020417';

const renderAndAdd = async () => {
  const screen = renderWithProvider(<WatchOnlyDeveloperOptionsSection />);
  fireEvent.changeText(
    screen.getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
    ` ${ADDRESS} `,
  );
  await act(async () => {
    fireEvent.press(
      screen.getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
    );
  });
  return screen;
};

describe('WatchOnlyDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
  });

  it('labels the address input for screen readers', () => {
    const { getByTestId } = renderWithProvider(
      <WatchOnlyDeveloperOptionsSection />,
    );

    expect(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
    ).toHaveProp(
      'accessibilityLabel',
      strings('app_settings.developer_options.watch_only.address_placeholder'),
    );
  });

  it('creates the trimmed address as a watch-only account and selects it', async () => {
    mockCreateAccount.mockResolvedValue({ id: 'watch-id', address: ADDRESS });

    await renderAndAdd();

    expect(mockCreateAccount).toHaveBeenCalledWith(ADDRESS);
    expect(mockSelectAccount).toHaveBeenCalledWith('watch-id');
  });

  it('shows and announces the added account name', async () => {
    mockCreateAccount.mockResolvedValue({ id: 'watch-id', address: ADDRESS });
    const expected = strings(
      'app_settings.developer_options.watch_only.added',
      { name: 'Watch-only Account 1' },
    );

    const { findByTestId } = await renderAndAdd();

    expect(
      await findByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_RESULT),
    ).toHaveTextContent(expected);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      expected,
    );
  });

  it('shows the error, logs it and selects nothing when creation fails', async () => {
    const error = new Error('Invalid address');
    mockCreateAccount.mockRejectedValue(error);

    const { findByTestId } = await renderAndAdd();

    expect(
      await findByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_RESULT),
    ).toHaveTextContent(
      strings('app_settings.developer_options.watch_only.add_error', {
        message: 'Invalid address',
      }),
    );
    expect(Logger.error).toHaveBeenCalledWith(
      error,
      'WatchOnlyDeveloperOptionsSection: add watch-only account failed',
    );
    expect(mockSelectAccount).not.toHaveBeenCalled();
  });
});
