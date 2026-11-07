import '../../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderDeveloperOptions } from '../../../../../tests/component-view/renderers/settings';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';

const originalEnv = { ...process.env };
const { WATCH_ONLY_ADDRESS_INPUT, WATCH_ONLY_ADD_BUTTON } =
  DeveloperOptionsSelectorsIDs;

describeForPlatforms('DeveloperOptions watch-only section', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it.each([
    ['dev', 'false'],
    ['production', 'true'],
  ])(
    'is hidden with METAMASK_ENVIRONMENT=%s and the flag %s',
    async (environment, flag) => {
      process.env.METAMASK_ENVIRONMENT = environment;
      process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = flag;

      const { findByTestId, queryByTestId } = renderDeveloperOptions();

      await findByTestId(DeveloperOptionsSelectorsIDs.CONTAINER);
      expect(queryByTestId(WATCH_ONLY_ADDRESS_INPUT)).not.toBeOnTheScreen();
      expect(queryByTestId(WATCH_ONLY_ADD_BUTTON)).not.toBeOnTheScreen();
    },
  );

  it('is shown in dev builds with the flag on', async () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = 'true';

    const { findByTestId, getByTestId } = renderDeveloperOptions();

    expect(await findByTestId(WATCH_ONLY_ADDRESS_INPUT)).toBeOnTheScreen();
    expect(getByTestId(WATCH_ONLY_ADD_BUTTON)).toBeOnTheScreen();
  });
});
