import '../../../../../tests/component-view/mocks';
import { describeForPlatforms } from '../../../../../tests/component-view/platform';
import { renderDeveloperOptions } from '../../../../../tests/component-view/renderers/settings';
import { DeveloperOptionsSelectorsIDs } from './DeveloperOptions.testIds';

const originalEnv = { ...process.env };

describeForPlatforms('DeveloperOptions watch-only section', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it.each([
    ['dev', 'false', false],
    ['production', 'true', false],
    ['dev', 'true', true],
  ])(
    'with METAMASK_ENVIRONMENT=%s and the flag %s, shown: %s',
    async (environment, flag, shown) => {
      process.env.METAMASK_ENVIRONMENT = environment;
      process.env.MM_WATCH_ONLY_ACCOUNTS_ENABLED = flag;

      const { findByTestId, queryByTestId } = renderDeveloperOptions();

      await findByTestId(DeveloperOptionsSelectorsIDs.CONTAINER);
      expect(
        queryByTestId(DeveloperOptionsSelectorsIDs.WATCH_ONLY_ADDRESS_INPUT) !==
          null,
      ).toBe(shown);
    },
  );
});
