
/**
 * @typedef {Object} EventData
 * @property {string} event - The name of the event (e.g., 'Onboarding Tour Skipped').
 * @property {Object} properties - Additional properties related to the event.
 */

/**
 * A helper class for managing and tracking analytics events.
 */
export default class AnalyticsHelper {
  /**
   * Stores the list of analytics events.
   * @type {Array<EventData>}
   */
  static events = [];

  /**
   * Clears all stored analytics events.
   * @returns {Promise<void>} A promise that resolves when the events are cleared.
   */
  static async clearEvents() {
    this.events = [];
  }

  /**
   * Retrieves all analytics events of a specific type.
   * @param {string} eventType - The type of event to filter by.
   * @returns {Promise<Array<EventData>>} A promise that resolves to an array of events matching the specified type.
   */
  static async getEventsByType(eventType) {
    return this.events.filter(event => event.event === eventType);
  }

  /**
   * Retrieves all stored analytics events.
   * @returns {Promise<Array<EventData>>} A promise that resolves to an array of all stored events.
   */
  static async getAllEvents() {
    return this.events;
  }

  /**
   * Handles and stores a new analytics event.
   * @param {EventData} eventData - The data of the event to be tracked.
   */
  static handleTrackEvent(eventData) {
    this.events.push(eventData);
  }
}
