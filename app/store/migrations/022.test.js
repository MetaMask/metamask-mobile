import migrate from './022';

describe('Migration #22', () => {
  it('should DisplayNftMedia have the same value as openSeaEnabled and delete openSeaEnabled property and delete nftDetectionDismissed', () => {
    const oldState = {
      user: { nftDetectionDismissed: true },
      engine: {
        backgroundState: { PreferencesController: { openSeaEnabled: true } },
      },
    };

    const newState = migrate(oldState);

    expect(newState).toStrictEqual({
      user: {},
      engine: {
        backgroundState: { PreferencesController: { displayNftMedia: true } },
      },
    });
  });
});
