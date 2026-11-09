import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
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

const ADDRESS = '0x5972698398d8c5bbe67c0db74906236691020417';

describe('WatchOnlyDeveloperOptionsSection', () => {
  it('adds the address as a watch-only account, selects it and shows its name', async () => {
    mockCreateAccount.mockResolvedValue({ id: 'watch-id', address: ADDRESS });
    const announce = jest
      .spyOn(AccessibilityInfo, 'announceForAccessibility')
      .mockImplementation(() => undefined);
    const { getByTestId, findByTestId } = renderWithProvider(
      <WatchOnlyDeveloperOptionsSection />,
    );

    fireEvent.changeText(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
      ` ${ADDRESS} `,
    );
    await act(async () => {
      fireEvent.press(
        getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
      );
    });

    const expected = strings(
      'app_settings.developer_options.watch_only.added',
      {
        name: 'Watch-only Account 1',
      },
    );
    const result = await findByTestId(
      DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_RESULT,
    );
    expect(result).toHaveTextContent(expected);
    expect(announce).toHaveBeenCalledWith(expected);
    expect(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
    ).toHaveProp(
      'accessibilityLabel',
      strings('app_settings.developer_options.watch_only.address_placeholder'),
    );
    expect(mockCreateAccount).toHaveBeenCalledWith(ADDRESS);
    expect(mockSelectAccount).toHaveBeenCalledWith('watch-id');
  });
});
