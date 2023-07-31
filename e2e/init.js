beforeAll(async () => {
  // Only port forward on android
  if (device.getPlatform() === 'android') {
    await device.reverseTcpPort(12345);
  }
  await device.launchApp({ permissions: { notifications: 'YES' } });
});
