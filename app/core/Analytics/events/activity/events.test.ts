import { ACTIVITY_SCREEN_EVENTS } from './events';

describe('ACTIVITY_SCREEN_EVENTS', () => {
  it('emits the event name "Activity Screen Viewed"', () => {
    // Arrange / Act
    const { category } = ACTIVITY_SCREEN_EVENTS.VIEWED;

    // Assert
    expect(category).toBe('Activity Screen Viewed');
  });

  it('does not emit the legacy "Activity Screen Opened" name', () => {
    // Arrange / Act - the legacy name is retained in segment-schema for
    // historical validation only and must not be emitted by any client.
    const emittedNames = Object.values(ACTIVITY_SCREEN_EVENTS).map(
      (event) => event.category,
    );

    // Assert
    expect(emittedNames).not.toContain('Activity Screen Opened');
  });

  it('carries no default properties, so call sites own the payload', () => {
    // Arrange / Act
    const event = ACTIVITY_SCREEN_EVENTS.VIEWED;

    // Assert
    expect(event).toStrictEqual({ category: 'Activity Screen Viewed' });
  });
});
