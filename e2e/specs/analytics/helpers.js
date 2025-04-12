import { E2E_METAMETRICS_TRACK_URL } from '../../../app/util/test/utils';

/**
 * Gets the payloads of all seen requests that match expected metametrics events.
 * @param {Object} mockServer - The mock server instance
 * @param {Array<string>} events - Array of event names to filter the payloads
 * @returns {Promise<Array>} Array of filtered request payloads
 */
export const getEventsPayloads = async (mockServer, events) => {
    const metametricsUrl = E2E_METAMETRICS_TRACK_URL;
    const mockedEndpoints = await mockServer.getMockedEndpoints();

    const pendingEndpoints = await Promise.all(
        mockedEndpoints.map((endpoint) => endpoint.isPending())
    );

    if (pendingEndpoints.some(isPending => isPending)) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return getEventsPayloads(mockServer, events);
    }

    const requests = await Promise.all(
        mockedEndpoints.map((endpoint) => endpoint.getSeenRequests())
    );

    const matchingRequests = requests.flat().filter(request => {
        const url = new URL(request.url);
        const proxiedUrl = url.searchParams.get('url');
        return proxiedUrl && proxiedUrl.includes(metametricsUrl);
    });

    const payloads = (
        await Promise.all(
            matchingRequests.map(async (req) => await req.body?.getJson()),
        )
    ).filter(Boolean);

    return payloads.filter(payload => events.includes(payload.event));
};
