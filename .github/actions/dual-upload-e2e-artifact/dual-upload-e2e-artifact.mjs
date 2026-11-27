const STORE_CONFIGS = [
  {
    outcomePrefix: 'NS',
    storeName: 'Namespace',
  },
  {
    outcomePrefix: 'GH',
    storeName: 'GitHub',
  },
];

const ATTEMPTS = [1, 2, 3];

const getEnv = (name, fallback = '') => process.env[name] || fallback;

const isSuccessfulOutcome = (outcome) => outcome === 'success';

const getStoreOutcomes = (outcomePrefix) =>
  ATTEMPTS.map((attempt) => getEnv(`${outcomePrefix}_${attempt}`));

const hasSuccessfulUpload = (outcomePrefix) =>
  getStoreOutcomes(outcomePrefix).some(isSuccessfulOutcome);

const isNamespaceRunnerProvider = () =>
  getEnv('RUNNER_PROVIDER').includes('namespace');

const isFalse = (name) => getEnv(name).toLowerCase() === 'false';

const getRequiredStoreConfigs = () => {
  const skipGithub = getEnv('SKIP_GITHUB').toLowerCase() === 'true';

  if (!isNamespaceRunnerProvider()) {
    // Non-Namespace runners only have the GitHub store; skip-github cannot apply.
    return STORE_CONFIGS.filter(({ outcomePrefix }) => outcomePrefix === 'GH');
  }

  if (skipGithub) {
    return STORE_CONFIGS.filter(({ outcomePrefix }) => outcomePrefix === 'NS');
  }

  // GitHub stays attempted and retried; it just stops being able to fail the
  // step once Namespace, the store the workflow reads back, has the artifact.
  if (isFalse('GITHUB_REQUIRED')) {
    return STORE_CONFIGS.filter(({ outcomePrefix }) => outcomePrefix === 'NS');
  }

  return STORE_CONFIGS;
};

const warnAboutOptionalStores = (requiredConfigs) => {
  const optionalConfigs = STORE_CONFIGS.filter(
    (config) => !requiredConfigs.includes(config),
  );

  for (const { outcomePrefix, storeName } of optionalConfigs) {
    const outcomes = getStoreOutcomes(outcomePrefix);
    const attempted = outcomes.some(
      (outcome) => outcome && outcome !== 'skipped',
    );

    if (attempted && !hasSuccessfulUpload(outcomePrefix)) {
      console.log(
        `::warning::Optional ${storeName} artifact upload failed after retries; continuing because the required stores succeeded.`,
      );
    }
  }
};

const wait = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

const runRetryWait = async () => {
  const attempt = Number(getEnv('ATTEMPT', '2'));
  const retryWaitSeconds = Number(getEnv('RETRY_WAIT_SECONDS', '15'));

  if (!Number.isFinite(attempt) || attempt < 2) {
    throw new Error(`Invalid retry attempt: ${getEnv('ATTEMPT')}`);
  }

  if (!Number.isFinite(retryWaitSeconds) || retryWaitSeconds < 0) {
    throw new Error(
      `Invalid retry wait seconds: ${getEnv('RETRY_WAIT_SECONDS')}`,
    );
  }

  const storeName = getEnv('STORE_NAME', 'Namespace');
  const failureText = attempt > 2 ? 'failed again' : 'failed';
  console.log(
    `::warning::${storeName} upload ${failureText}; retrying after ${retryWaitSeconds}s`,
  );

  await wait(retryWaitSeconds * 1000);
};

const runRequireBothStores = () => {
  const requiredConfigs = getRequiredStoreConfigs();
  const results = requiredConfigs.map(({ outcomePrefix, storeName }) => ({
    storeName,
    ok: hasSuccessfulUpload(outcomePrefix),
  }));

  if (results.every(({ ok }) => ok)) {
    warnAboutOptionalStores(requiredConfigs);
    console.log(
      `Uploaded to ${results.map(({ storeName }) => storeName).join(' and ')} store${results.length === 1 ? '' : 's'}`,
    );
    return;
  }

  const summary = results
    .map(({ storeName, ok }) => `${storeName}=${ok}`)
    .join(' ');
  console.error(
    `::error::Dual artifact upload failed (${summary}). Required stores must succeed.`,
  );
  process.exitCode = 1;
};

const main = async () => {
  const command = process.argv[2];

  if (command === 'retry-wait') {
    await runRetryWait();
    return;
  }

  if (command === 'require-both-stores') {
    runRequireBothStores();
    return;
  }

  throw new Error(`Unknown command: ${command || '(missing)'}`);
};

main().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exitCode = 1;
});
