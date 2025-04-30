import { E2E_METAMETRICS_TRACK_URL } from '../../../app/util/test/utils';

/**
 * Retrieves payloads of requests matching specified metametrics events.
 * @param {Object} mockServer - The mock server instance.
 * @param {Array<string>} [events] - Event names to filter payloads. If not provided, all events are returned. i.e. ['event1', 'event2']
 * @returns {Promise<Array>} Filtered request payloads.
 */
export const getEventsPayloads = async (mockServer, events = []) => {
  const waitForPendingEndpoints = async (timeout = 5000) => {
    const startTime = Date.now();

    const checkPendingEndpoints = async () => {
      const mockedEndpoints = await mockServer.getMockedEndpoints();
      const pendingEndpoints = await Promise.all(
        mockedEndpoints.map((endpoint) => endpoint.isPending()),
      );

      if (pendingEndpoints.some((isPending) => isPending)) {
        if (Date.now() - startTime >= timeout) {
          // eslint-disable-next-line no-console
          console.warn('Timeout reached while waiting for pending endpoints.');
          console.warn(
            'Some of the requests set up in the mock server were not completed.',
          );
          return mockedEndpoints;
        }
        // eslint-disable-next-line no-console
        console.log('Waiting for pending endpoints...');
        await new Promise((resolve) => setTimeout(resolve, 2500));
        return checkPendingEndpoints();
      }

      return mockedEndpoints;
    };

    return checkPendingEndpoints();
  };

  const mockedEndpoints = await waitForPendingEndpoints();

  const requests = (
    await Promise.all(
      mockedEndpoints.map((endpoint) => endpoint.getSeenRequests()),
    )
  ).flat();

  const metametricsUrl = E2E_METAMETRICS_TRACK_URL;

  const matchingRequests = requests.filter((request) => {
    const url = new URL(request.url);
    const proxiedUrl = url.searchParams.get('url');
    return proxiedUrl?.includes(metametricsUrl);
  });

  const payloads = (
    await Promise.all(matchingRequests.map((req) => req.body?.getJson()))
  ).filter(Boolean);

  return payloads
    .filter((payload) => events.length === 0 || events.includes(payload.event))
    .map(({ event, properties }) => ({ event, properties }));
};
