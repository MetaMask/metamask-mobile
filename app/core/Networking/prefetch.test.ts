import { QueryClient } from '@tanstack/react-query';
import { getNetworkConditions } from '../../util/deviceCapability/conditions';
import { isTierPolicyEnabled } from './killSwitch';
import { prefetchIfAllowed } from './prefetch';

jest.mock('../../util/deviceCapability/conditions');
jest.mock('./killSwitch');

it.each([
  ['LOW', true, false],
  ['LOW', false, true],
  ['MID', true, true],
] as const)(
  'gates speculative work on %s (switch: %s)',
  async (hardware, enabled, allowed) => {
    jest
      .mocked(getNetworkConditions)
      .mockReturnValue({ hardware, network: 'WIFI', latency: 'OK' });
    jest.mocked(isTierPolicyEnabled).mockReturnValue(enabled);
    const client = new QueryClient({
      defaultOptions: { queries: { gcTime: Infinity } },
    });
    const queryFn = jest.fn().mockResolvedValue('public fixture');

    await prefetchIfAllowed(client, { queryKey: ['fixture'], queryFn });

    expect(queryFn).toHaveBeenCalledTimes(allowed ? 1 : 0);
    expect(client.getQueryData(['fixture'])).toBe(
      allowed ? 'public fixture' : undefined,
    );
    client.clear();
  },
);
