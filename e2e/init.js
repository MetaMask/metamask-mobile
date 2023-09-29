beforeAll(async () => {
  await device.launchApp({
    launchArgs: { jestWorkerId: `${process.env.JEST_WORKER_ID}` },
  });
});
