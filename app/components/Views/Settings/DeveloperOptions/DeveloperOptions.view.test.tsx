/**
 * Component view tests for Developer Options: the watch-only account section
 * follows the dev-only build gate (environment + flag) read at render time.
 *
 * Run: yarn jest -c jest.config.view.js DeveloperOptions.view.test.tsx --runInBand
 */
import '../../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderDeveloperOptions } from '../../../../../tests/component-view/renderers/settings';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';

const originalFlag = process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED;
const originalEnvironment = process.env.METAMASK_ENVIRONMENT;

const restoreEnv = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

describeForPlatforms('DeveloperOptions watch-only section', () => {
  afterEach(() => {
    restoreEnv('MM_WATCH_ONLY_ACCOUNTS_ENABLED', originalFlag);
    restoreEnv('METAMASK_ENVIRONMENT', originalEnvironment);
  });

  it.each([
    ['hidden in dev builds with the flag off', 'dev', 'false'],
    ['hidden in production builds with the flag on', 'production', 'true'],
  ])('is %s', async (_name, environment, flag) => {
    process.env.METAMASK_ENVIRONMENT = environment;
    process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = flag;

    const { findByTestId, queryByTestId } = renderDeveloperOptions();

    expect(
      await findByTestId(DeveloperOptionsSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
    ).not.toBeOnTheScreen();
    expect(
      queryByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
    ).not.toBeOnTheScreen();
  });

  it('is shown in dev builds with the flag on', async () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = 'true';

    const { findByTestId, getByTestId } = renderDeveloperOptions();

    expect(
      await findByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT),
    ).toBeOnTheScreen();
    expect(
      getByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
    ).toBeOnTheScreen();
  });
});
