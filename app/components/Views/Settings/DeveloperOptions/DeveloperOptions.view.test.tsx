import '../../../../../tests/component-view/mocks';
import { act, fireEvent } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { strings } from '../../../../../locales/i18n';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderDeveloperOptions } from '../../../../../tests/component-view/renderers/settings';
import {
  setWatchOnlyBuildEnv,
  withWatchOnlyBuildEnabled,
} from '../../../../util/test/watchOnlyBuildEnv';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';

const ADDRESS = '0x5972698398d8c5bbe67c0db74906236691020417';
const ACCOUNT_NAME = 'Watch-only Account 1';

const createAccount = jest.fn();
const setSelectedAccountGroupByAccountId = jest.fn();

describeForPlatforms('DeveloperOptions watch-only section', () => {
  withWatchOnlyBuildEnabled();

  beforeEach(() => {
    jest.clearAllMocks();
    // The CV Engine has no watch-only service and none of the account tree
    // lookups the section uses after adding.
    Object.assign(Engine.context, {
      WatchOnlyAccountService: { createAccount },
    });
    Object.assign(Engine.context.AccountTreeController, {
      setSelectedAccountGroupByAccountId,
      getAccountContext: () => ({ groupId: 'keyring:watch-only/watch-id' }),
      getAccountGroupObject: () => ({ metadata: { name: ACCOUNT_NAME } }),
    });
  });

  const renderAndAdd = async () => {
    const screen = renderDeveloperOptions();
    fireEvent.changeText(
      await screen.findByTestId(
        DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT,
      ),
      ` ${ADDRESS} `,
    );
    await act(async () => {
      fireEvent.press(
        screen.getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
      );
    });
    return screen;
  };

  it('shows the section with METAMASK_ENVIRONMENT=dev and the flag on', async () => {
    const { findByTestId } = renderDeveloperOptions();

    expect(
      await findByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
    ).toBeOnTheScreen();
  });

  it.each([
    ['dev', 'false'],
    ['production', 'true'],
  ])(
    'hides the section with METAMASK_ENVIRONMENT=%s and the flag %s',
    async (environment, flag) => {
      setWatchOnlyBuildEnv(environment, flag);

      const { findByTestId, queryByTestId } = renderDeveloperOptions();

      await findByTestId(DeveloperOptionsSelectorsIDs.CONTAINER);
      expect(
        queryByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
      ).not.toBeOnTheScreen();
    },
  );

  it('creates the trimmed address as a watch-only account and selects it', async () => {
    createAccount.mockResolvedValue({ id: 'watch-id', address: ADDRESS });

    await renderAndAdd();

    expect(createAccount).toHaveBeenCalledWith(ADDRESS);
    expect(setSelectedAccountGroupByAccountId).toHaveBeenCalledWith('watch-id');
  });

  it('shows the added account name', async () => {
    createAccount.mockResolvedValue({ id: 'watch-id', address: ADDRESS });
    const expected = strings(
      'app_settings.developer_options.watch_only.added',
      { name: ACCOUNT_NAME },
    );

    const { findByTestId } = await renderAndAdd();

    expect(
      await findByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_RESULT),
    ).toHaveTextContent(expected);
  });

  it('shows the error and selects nothing when creation fails', async () => {
    createAccount.mockRejectedValue(new Error('Invalid address'));

    const { findByTestId } = await renderAndAdd();

    expect(
      await findByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_RESULT),
    ).toHaveTextContent(
      strings('app_settings.developer_options.watch_only.add_error', {
        message: 'Invalid address',
      }),
    );
    expect(setSelectedAccountGroupByAccountId).not.toHaveBeenCalled();
  });
});
