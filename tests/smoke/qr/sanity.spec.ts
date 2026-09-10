import TestHelpers from '../../helpers';
describe('Sanity', () => {
  it('launches and connects', async () => {
    await TestHelpers.launchApp({ delete: true });
    await device.enableSynchronization();
  });
});
