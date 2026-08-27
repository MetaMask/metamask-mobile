import fs from 'fs';

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

const isNamespaceRunnerProvider = (
  runnerProvider = getEnv('RUNNER_PROVIDER'),
) => runnerProvider.includes('namespace');

const isRetryableNamespaceUploadError = (errorMessage) => {
  if (!errorMessage) {
    return true;
  }

  return /CreateArtifact.*ECONNREFUSED|ECONNREFUSED.*CreateArtifact|ECONNREFUSED/i.test(
    errorMessage,
  );
};

const getNamespaceRetryDecision = ({
  runnerProvider,
  nextAttempt,
  previousOutcomes,
  errorMessage,
}) => {
  if (!isNamespaceRunnerProvider(runnerProvider)) {
    return { retryable: false, reason: 'not-namespace-runner' };
  }

  if (!Number.isFinite(nextAttempt) || nextAttempt < 2 || nextAttempt > 3) {
    return { retryable: false, reason: 'attempt-out-of-range' };
  }

  if (!previousOutcomes.every((outcome) => outcome === 'failure')) {
    return { retryable: false, reason: 'previous-attempt-did-not-fail' };
  }

  if (!isRetryableNamespaceUploadError(errorMessage)) {
    return { retryable: false, reason: 'non-retryable-error' };
  }

  return {
    retryable: true,
    reason: errorMessage
      ? 'retryable-error'
      : 'nested-action-error-unavailable',
  };
};

const writeOutput = (name, value) => {
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }

  console.log(`${name}=${value}`);
};

const getRequiredStoreConfigs = () => {
  if (!isNamespaceRunnerProvider()) {
    return STORE_CONFIGS.filter(({ outcomePrefix }) => outcomePrefix === 'GH');
  }

  return STORE_CONFIGS;
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

  const failureText = attempt > 2 ? 'failed again' : 'failed';
  console.log(
    `::warning::Namespace upload ${failureText}; retrying after ${retryWaitSeconds}s (INFRA-3902)`,
  );

  await wait(retryWaitSeconds * 1000);
};

const runNamespaceRetryDecision = () => {
  const decision = getNamespaceRetryDecision({
    runnerProvider: getEnv('RUNNER_PROVIDER'),
    nextAttempt: Number(getEnv('ATTEMPT', '2')),
    previousOutcomes: getEnv('PREVIOUS_OUTCOMES').split(',').filter(Boolean),
    errorMessage: getEnv('ERROR_MESSAGE'),
  });

  writeOutput('retryable', String(decision.retryable));
  writeOutput('reason', decision.reason);
};

const runRequireBothStores = () => {
  const results = getRequiredStoreConfigs().map(
    ({ outcomePrefix, storeName }) => ({
      storeName,
      ok: hasSuccessfulUpload(outcomePrefix),
    }),
  );

  if (results.every(({ ok }) => ok)) {
    console.log(
      `Uploaded to ${results.map(({ storeName }) => storeName).join(' and ')} store${results.length === 1 ? '' : 's'}`,
    );
    return;
  }

  const summary = results
    .map(({ storeName, ok }) => `${storeName}=${ok}`)
    .join(' ');
  console.error(
    `::error::Dual artifact upload failed (${summary}). Both stores must succeed.`,
  );
  process.exitCode = 1;
};

const main = async () => {
  const command = process.argv[2];

  if (command === 'retry-wait') {
    await runRetryWait();
    return;
  }

  if (command === 'namespace-retry-decision') {
    runNamespaceRetryDecision();
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
