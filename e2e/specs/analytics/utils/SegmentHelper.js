
/**
 * @typedef {Object} EventData
 * @property {string} event - The name of the event (e.g., 'Onboarding Tour Skipped').
 * @property {Object} properties - Additional properties related to the event.
 */

/**
 * A helper class for managing and tracking segment events.
 */
export default class SegmentHelper {
  /**
   * Stores the list of segment events.
   * @type {Array<EventData>}
   */
  static events = [];

  /**
   * Clears all stored segment events.
   * @returns {Promise<void>} A promise that resolves when the events are cleared.
   */
  static async clearEvents() {
    this.events = [];
  }

  /**
   * Retrieves all segment events of a specific name.
   * @param {string} eventName - The name of the event to filter by.
   * @returns {Promise<Array<EventData>>} A promise that resolves to an array of events matching the specified name.
   */
  static async getEventsByName(eventName) {
    return this.events.filter(event => event.event === eventName);
  }

  /**
   * Retrieves all stored segment events.
   * @returns {Promise<Array<EventData>>} A promise that resolves to an array of all stored events.
   */
  static async getAllEvents() {
    return this.events;
  }

  /**
   * Handles and stores a new segment event.
   * @param {EventData} eventData - The data of the event to be tracked.
   */
  static handleTrackEvent(eventData) {
    this.events.push(eventData);
  }

  /**
   * Asserts that an event with the specified name and properties exists.
   * @param {string} eventName - The name of the event to check for.
   * @param {Object} expectedProperties - The properties to match against.
   * @throws {Error} If no event with the specified name and properties is found.
   */
  static async assertEventWithPropertiesExists(eventName, expectedProperties) {
    const events = await this.getEventsByName(eventName);
    const matchingEvent = events.find(event =>
      Object.entries(expectedProperties).every(
        ([key, value]) => event.properties[key] === value
      )
    );

    if (!matchingEvent) {
      throw new Error(
        `Event with name "${eventName}" and properties ${JSON.stringify(
          expectedProperties
        )} does not exist.`
      );
    }
  }
}
