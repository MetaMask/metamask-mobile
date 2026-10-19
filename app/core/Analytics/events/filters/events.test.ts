import { FILTER_EVENTS } from './events';

describe('FILTER_EVENTS', () => {
  it('emits the event name "Filter Clicked"', () => {
    // Arrange / Act
    const { category } = FILTER_EVENTS.CLICKED;

    // Assert
    expect(category).toBe('Filter Clicked');
  });

  it('carries no default properties, so call sites own the payload', () => {
    // Arrange / Act
    const event = FILTER_EVENTS.CLICKED;

    // Assert
    expect(event).toStrictEqual({ category: 'Filter Clicked' });
  });
});
