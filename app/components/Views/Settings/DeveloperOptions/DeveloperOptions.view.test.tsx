import '../../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderDeveloperOptions } from '../../../../../tests/component-view/renderers/settings';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';

const originalEnv = { ...process.env };

describeForPlatforms('DeveloperOptions watch-only section', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('shows the section with METAMASK_ENVIRONMENT=dev and the flag on', async () => {
    process.env.METAMASK_ENVIRONMENT = 'dev';
    process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = 'true';

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
      process.env.METAMASK_ENVIRONMENT = environment;
      process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = flag;

      const { findByTestId, queryByTestId } = renderDeveloperOptions();

      await findByTestId(DeveloperOptionsSelectorsIDs.CONTAINER);
      expect(
        queryByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADD_BUTTON),
      ).not.toBeOnTheScreen();
    },
  );
});
