import {
  clearAgenticCliLoginConnectionEstablished,
  markAgenticCliLoginConnectionEstablished,
  waitForAgenticCliLoginConnectionEstablished,
} from './agenticCliConnectionSession';
import { ENGINE_READY_POLL_MS } from './agenticCliConfig';

const mockAdvancingTimers = (onSetTimeout?: (delay: number) => void): void => {
  let now = 0;
  (Date.now as jest.Mock).mockImplementation(() => now);

  jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay = 0) => {
    now += Number(delay);
    onSetTimeout?.(Number(delay));
    callback();
    return 0 as unknown as NodeJS.Timeout;
  });
};

describe('agenticCliConnectionSession', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Date.now = jest.fn(() => 123);
    clearAgenticCliLoginConnectionEstablished();
  });

  it('waits until login connection is marked established', async () => {
    mockAdvancingTimers(() => {
      markAgenticCliLoginConnectionEstablished();
    });

    await expect(
      waitForAgenticCliLoginConnectionEstablished(1_000, ENGINE_READY_POLL_MS),
    ).resolves.toBeUndefined();
  });

  it('rejects when login connection is not established before timeout', async () => {
    mockAdvancingTimers();

    await expect(
      waitForAgenticCliLoginConnectionEstablished(
        ENGINE_READY_POLL_MS * 2,
        ENGINE_READY_POLL_MS,
      ),
    ).rejects.toThrow('Timed out waiting for Agentic CLI login connection');
  });
});
