/**
 * @typedef {Object} EventData
 * @property {string} event - The name of the event (e.g., 'Onboarding Tour Skipped').
 * @property {Object} properties - Additional properties related to the event.
 */

/**
 * A helper class for managing and tracking segment events.
 */
export default class SegmentTracker {
  /**
   * Creates an instance of SegmentTracker.
   * @param {string} detoxTestId - The device ID used for tracking.
   * @param {import('mockttp').Mockttp} server - The mockttp server instance.
   */
  constructor(detoxTestId, server) {
    /**
     * The device ID used for tracking.
     * @type {string}
     */
    this.detoxTestId = detoxTestId;

    /**
     * The mockttp server instance.
     */
    this.server = server;

    /**
     * Stores the list of segment events for this instance.
     * @type {Array<EventData>}
     */
    this.events = [];
  }

  /**
   * Begins tracking segment events by setting up the server endpoint.
   * @returns {Promise<void>} A promise that resolves when tracking setup is complete.
   */
  async startTracking() {
    await this.server
      .forPost('/mm_test_track')
      .withHeaders({
        'X-Detox-Test-Id': this.detoxTestId,
      })
      .thenCallback(async (req) => {
        let body;
        try {
          body = await req.body.getJson();
          this.handleTrackEvent(body);
        } catch (e) {
          console.error('TRACK EVENT error:', e);
        }

        return {
          status: 200,
          json: body
        };
      });
  }

  /**
   * Handles and stores a new segment event.
   * @param {EventData} eventData - The data of the event to be tracked.
   * @private
   */
  handleTrackEvent(eventData) {
    this.events.push(eventData);
  }

  /**
   * Clears all stored segment events.
   * @returns {void}
   */
  clearEvents() {
    this.events = [];
  }

  /**
   * Retrieves all segment events of a specific name.
   * @param {string} eventName - The name of the event to filter by.
   * @returns {Array<EventData>} An array of events matching the specified name.
   */
  getEventsByName(eventName) {
    return this.events.filter(event => event.event === eventName);
  }

  /**
   * Retrieves all stored segment events.
   * @returns {Array<EventData>} An array of all stored events.
   */
  getAllEvents() {
    return this.events;
  }

}
