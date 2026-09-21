import { ACTIVITY_DETAIL_EVENTS } from './events';

const LEGACY_EVENT_NAME = 'Transaction Detail List Item Clicked';

describe('ACTIVITY_DETAIL_EVENTS', () => {
  it('emits the event name "Activity Details Opened"', () => {
    // Arrange / Act
    const { category } = ACTIVITY_DETAIL_EVENTS.OPENED;

    // Assert
    expect(category).toBe('Activity Details Opened');
  });

  it('no longer emits the legacy event name', () => {
    // Arrange / Act
    const emittedNames = Object.values(ACTIVITY_DETAIL_EVENTS).map(
      (event) => event.category,
    );

    // Assert
    expect(emittedNames).not.toContain(LEGACY_EVENT_NAME);
  });

  it('carries no default properties, so call sites own the payload', () => {
    // Arrange / Act
    const event = ACTIVITY_DETAIL_EVENTS.OPENED;

    // Assert
    expect(event).toStrictEqual({ category: 'Activity Details Opened' });
  });
});
