beforeAll(async () => {
  await device.launchApp();
});

beforeEach(async () => {});

afterAll(async () => {
  await detox.cleanup();
});
