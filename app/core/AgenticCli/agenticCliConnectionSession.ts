import {
  AGENTIC_CLI_MWP_CONNECTION_WAIT_MS,
  ENGINE_READY_POLL_MS,
} from './agenticCliConfig';

let establishedLoginConnection = false;

export const markAgenticCliLoginConnectionEstablished = (): void => {
  establishedLoginConnection = true;
};

export const clearAgenticCliLoginConnectionEstablished = (): void => {
  establishedLoginConnection = false;
};

export const waitForAgenticCliLoginConnectionEstablished = async (
  timeoutMs = AGENTIC_CLI_MWP_CONNECTION_WAIT_MS,
  pollMs = ENGINE_READY_POLL_MS,
): Promise<void> => {
  if (establishedLoginConnection) {
    return;
  }

  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    if (establishedLoginConnection) {
      return;
    }
  }

  throw new Error('Timed out waiting for Agentic CLI login connection');
};
