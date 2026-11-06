import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import WatchOnlyDeveloperOptionsSection from './WatchOnlyDeveloperOptionsSection';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      WatchOnlyAccountService: { createAccount: jest.fn() },
      AccountTreeController: {
        setSelectedAccountGroupByAccountId: jest.fn(),
        getAccountContext: jest.fn(),
        getAccountGroupObject: jest.fn(),
      },
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const ADDRESS = '0x5972698398d8c5bbe67c0db74906236691020417';
const { WatchOnlyAccountService, AccountTreeController } = Engine.context;
const mockCreateAccount = WatchOnlyAccountService.createAccount as jest.Mock;
const mockSetSelectedAccountGroupByAccountId =
  AccountTreeController.setSelectedAccountGroupByAccountId as jest.Mock;
const mockGetAccountContext =
  AccountTreeController.getAccountContext as jest.Mock;
const mockGetAccountGroupObject =
  AccountTreeController.getAccountGroupObject as jest.Mock;

const renderSection = () =>
  renderWithProvider(<WatchOnlyDeveloperOptionsSection />);

describe('WatchOnlyDeveloperOptionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('keeps Add disabled until an address is entered', () => {
    const { getByTestId } = renderSection();

    fireEvent.press(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
    );

    expect(mockCreateAccount).not.toHaveBeenCalled();
  });

  it('adds the address as a watch-only account, selects it and shows its name', async () => {
    mockCreateAccount.mockResolvedValue({ id: 'watch-id', address: ADDRESS });
    mockGetAccountContext.mockReturnValue({
      groupId: 'keyring:watch-only/watch-id',
    });
    mockGetAccountGroupObject.mockReturnValue({
      metadata: { name: 'Watch-only Account 1' },
    });
    const { getByTestId, findByTestId } = renderSection();

    fireEvent.changeText(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
      `  ${ADDRESS} `,
    );
    fireEvent.press(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
    );

    const result = await findByTestId(
      DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_RESULT,
    );
    expect(mockCreateAccount).toHaveBeenCalledWith(ADDRESS);
    expect(mockSetSelectedAccountGroupByAccountId).toHaveBeenCalledWith(
      'watch-id',
    );
    expect(mockGetAccountGroupObject).toHaveBeenCalledWith(
      'keyring:watch-only/watch-id',
    );
    expect(result).toHaveTextContent('Added Watch-only Account 1');
  });

  it('shows the error and selects nothing when the address is refused', async () => {
    mockCreateAccount.mockRejectedValue(new Error('Duplicated account'));
    const { getByTestId, findByTestId } = renderSection();

    fireEvent.changeText(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
      ADDRESS,
    );
    fireEvent.press(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
    );

    const result = await findByTestId(
      DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_RESULT,
    );
    await waitFor(() =>
      expect(result).toHaveTextContent(
        'Could not add this address: Duplicated account',
      ),
    );
    expect(mockSetSelectedAccountGroupByAccountId).not.toHaveBeenCalled();
  });
});
