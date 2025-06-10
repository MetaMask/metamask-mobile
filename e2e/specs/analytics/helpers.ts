import { MockttpServer, ServerMockedEndpoint } from 'mockttp';
import { E2E_METAMETRICS_TRACK_URL } from '../../../app/util/test/utils';

export interface EventPayload {
  event: string;
  properties: Record<string, unknown>;
}

/**
 * Retrieves payloads of requests matching specified metametrics events.
 * @param {MockttpServer} mockServer - The mock server instance.
 * @param {Array<string>} [events] - Event names to filter payloads. If not provided, all events are returned. i.e. ['event1', 'event2']
 * @returns {Promise<Array<EventPayload>>} Filtered request payloads.
 */
export const getEventsPayloads = async (
  mockServer: MockttpServer,
  events: string[] = [],
): Promise<EventPayload[]> => {
  const waitForPendingEndpoints = async (timeout = 5000): Promise<ServerMockedEndpoint[]> => {
    const startTime = Date.now();

    const checkPendingEndpoints = async (): Promise<ServerMockedEndpoint[]> => {
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

  return (payloads as EventPayload[])
    .filter((payload) => events.length === 0 || events.includes(payload.event))
    .map(({ event, properties }) => ({ event, properties }));
};

/**
 * Finds the first event object in the payloads array matching the given event name.
 * @param {Array<EventPayload>} payloads - Array of event payloads.
 * @param {string} eventName - The event name to find.
 * @returns {EventPayload|undefined} The first matching event object, or undefined if not found.
 */
export const findEvent = (
  payloads: EventPayload[],
  eventName: string,
): EventPayload | undefined => payloads.find((payload) => payload.event === eventName);

/**
 * Filters event objects in the payloads array matching the given event name.
 * @param {Array<EventPayload>} payloads - Array of event payloads.
 * @param {string} eventName - The event name to filter by.
 * @returns {Array<EventPayload>} Array of matching event objects.
 */
export const filterEvents = (
  payloads: EventPayload[],
  eventName: string,
): EventPayload[] => payloads.filter((payload) => payload.event === eventName);


export const onboardingEvents = {
  ANALYTICS_PREFERENCE_SELECTED: 'Analytics Preference Selected',
  WELCOME_MESSAGE_VIEWED: 'Welcome Message Viewed',
  WELCOME_SCREEN_ENGAGEMENT: 'Welcome Screen Engagement',
  ONBOARDING_STARTED: 'Onboarding Started',
  WALLET_IMPORTED: 'Wallet Imported',
  WALLET_SETUP_STARTED: 'Wallet Setup Started',
  WALLET_IMPORT_STARTED: 'Wallet Import Started',
  WALLET_IMPORT_ATTEMPTED: 'Wallet Import Attempted',
  TERMS_OF_USE_ACCEPTED: 'Terms of Use Accepted',
  WALLET_CREATION_ATTEMPTED: 'Wallet Creation Attempted',
  WALLET_CREATED: 'Wallet Created',
  WALLET_SETUP_COMPLETED: 'Wallet Setup Completed',
  WALLET_SECURITY_STARTED: 'Wallet Security Started',
  MANUAL_BACKUP_INITIATED: 'Manual Backup Initiated',
  WALLET_SECURITY_SKIP_INITIATED: 'Wallet Security Skip Initiated',
  PHRASE_REVEALED: 'Phrase Revealed',
  PHRASE_CONFIRMED: 'Phrase Confirmed',
  AUTOMATIC_SECURITY_CHECKS_PROMPT_VIEWED:
    'Automatic Security Checks Prompt Viewed',
  AUTOMATIC_SECURITY_CHECKS_DISABLED_FROM_PROMPT:
    'Automatic Security Checks Disabled From Prompt',
  WALLET_SECURITY_REMINDER_DISMISSED: 'Wallet Security Reminder Dismissed',
  ONBOARDING_TOUR_SKIPPED: 'Onboarding Tour Skipped',
  ONBOARDING_TOUR_COMPLETED: 'Onboarding Tour Completed',
  WALLET_SECURITY_SKIP_CONFIRMED: 'Wallet Security Skip Confirmed',
};
