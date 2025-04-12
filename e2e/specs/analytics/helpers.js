import { E2E_METAMETRICS_TRACK_URL } from '../../../app/util/test/utils';

/**
 * Retrieves payloads of requests matching specified metametrics events.
 * @param {Object} mockServer - The mock server instance.
 * @param {Array<string>} events - Event names to filter payloads.
 * @returns {Promise<Array>} Filtered request payloads.
 */
export const getEventsPayloads = async (mockServer, events) => {

    const waitForPendingEndpoints = async () => {
        const mockedEndpoints = await mockServer.getMockedEndpoints();
        const pendingEndpoints = await Promise.all(
            mockedEndpoints.map(endpoint => endpoint.isPending())
        );

        if (pendingEndpoints.some(isPending => isPending)) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return waitForPendingEndpoints();
        }

        return mockedEndpoints;
    };

    const mockedEndpoints = await waitForPendingEndpoints();

    const requests = (
        await Promise.all(mockedEndpoints.map(endpoint => endpoint.getSeenRequests()))
    ).flat();


    const metametricsUrl = E2E_METAMETRICS_TRACK_URL;

    const matchingRequests = requests.filter(request => {
        const url = new URL(request.url);
        const proxiedUrl = url.searchParams.get('url');
        return proxiedUrl?.includes(metametricsUrl);
    });

    const payloads = (
        await Promise.all(matchingRequests.map(req => req.body?.getJson()))
    ).filter(Boolean);

    return payloads
        .filter(payload => events.includes(payload.event))
        .map(({ event, properties }) => ({ event, properties }));
};
