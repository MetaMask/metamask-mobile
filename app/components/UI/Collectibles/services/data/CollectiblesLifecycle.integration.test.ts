import { CollectiblesSocialApiClient } from '../clients/CollectiblesSocialApiClient';
import { buildCollectiblesSocialApiDataHarness } from '../../../../../../tests/integration/harnesses/collectibles-discovery/social-data-services';
import { buildPackPartnerIntegrationHarness } from '../../../../../../tests/integration/harnesses/pack-partner/pack-partner';
import { buildPackPartnerPersistenceHarness } from '../../../../../../tests/integration/harnesses/pack-partner/storage';

describe('Collectibles data infrastructure', () => {
  it('creates and resets the workflow without calling the partner or the Snap', async () => {
    const harness = buildPackPartnerIntegrationHarness();

    try {
      await harness.resetWallet();

      expect(harness.fetchMock).not.toHaveBeenCalled();
      expect(harness.snapMock).not.toHaveBeenCalled();
    } finally {
      await harness.cleanup();
    }
  });

  it('clears only Pack Partner storage on wallet reset', async () => {
    const harness = buildPackPartnerPersistenceHarness();
    const key = 'snapshot';

    try {
      await harness.messenger.call(
        'StorageService:setItem',
        harness.service.name,
        key,
        'old wallet',
      );
      await harness.storage.setItem('AnotherService', key, 'keep');

      await harness.service.clearCache();

      await expect(
        harness.storage.getItem(harness.service.name, key),
      ).resolves.toEqual({});
      await expect(
        harness.storage.getItem('AnotherService', key),
      ).resolves.toEqual({ result: 'keep' });
    } finally {
      harness.cleanup();
    }
  });

  it('connects the Social query bridge without fetching on startup', () => {
    const harness = buildCollectiblesSocialApiDataHarness(
      new CollectiblesSocialApiClient(),
    );

    try {
      expect(harness.ui.isFetching()).toBe(0);
      expect(harness.service.name).toBe('CollectiblesSocialApiDataService');
    } finally {
      harness.destroy();
    }
  });
});
