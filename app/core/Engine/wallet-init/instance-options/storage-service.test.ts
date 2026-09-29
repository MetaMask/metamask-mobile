import { getStorageServiceInstanceOptions } from './storage-service';
import { mobileStorageAdapter } from '../../utils/storage-service-utils';

jest.mock('../../utils/storage-service-utils', () => ({
  mobileStorageAdapter: { name: 'mock-storage-adapter' },
}));

describe('getStorageServiceInstanceOptions', () => {
  it('builds options with the mobile storage adapter', () => {
    expect(getStorageServiceInstanceOptions()).toEqual({
      storage: mobileStorageAdapter,
    });
  });
});
