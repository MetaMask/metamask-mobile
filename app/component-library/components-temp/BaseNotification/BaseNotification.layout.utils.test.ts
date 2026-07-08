import { shouldTopAlignNotificationContent } from './BaseNotification.layout.utils';

describe('shouldTopAlignNotificationContent', () => {
  it('returns false when a trailing text button is present', () => {
    const result = shouldTopAlignNotificationContent({
      titleLineCount: 2,
      hasDescription: true,
      descriptionLineCount: 2,
      hasActionButton: true,
      hasTrailingTextButton: true,
    });

    expect(result).toBe(false);
  });

  it('returns true when the title spans multiple lines and a description exists', () => {
    const result = shouldTopAlignNotificationContent({
      titleLineCount: 2,
      hasDescription: true,
      descriptionLineCount: 1,
      hasActionButton: false,
      hasTrailingTextButton: false,
    });

    expect(result).toBe(true);
  });

  it('returns false when no description is present', () => {
    const result = shouldTopAlignNotificationContent({
      titleLineCount: 2,
      hasDescription: false,
      descriptionLineCount: null,
      hasActionButton: true,
      hasTrailingTextButton: false,
    });

    expect(result).toBe(false);
  });

  it('returns hasActionButton when description line count is not measured yet', () => {
    const withActionButton = shouldTopAlignNotificationContent({
      titleLineCount: 1,
      hasDescription: true,
      descriptionLineCount: null,
      hasActionButton: true,
      hasTrailingTextButton: false,
    });
    const withoutActionButton = shouldTopAlignNotificationContent({
      titleLineCount: 1,
      hasDescription: true,
      descriptionLineCount: null,
      hasActionButton: false,
      hasTrailingTextButton: false,
    });

    expect(withActionButton).toBe(true);
    expect(withoutActionButton).toBe(false);
  });

  it('returns true when the description spans multiple lines', () => {
    const result = shouldTopAlignNotificationContent({
      titleLineCount: 1,
      hasDescription: true,
      descriptionLineCount: 2,
      hasActionButton: false,
      hasTrailingTextButton: false,
    });

    expect(result).toBe(true);
  });

  it('returns hasActionButton when the description is a single line', () => {
    const withActionButton = shouldTopAlignNotificationContent({
      titleLineCount: 1,
      hasDescription: true,
      descriptionLineCount: 1,
      hasActionButton: true,
      hasTrailingTextButton: false,
    });
    const withoutActionButton = shouldTopAlignNotificationContent({
      titleLineCount: 1,
      hasDescription: true,
      descriptionLineCount: 1,
      hasActionButton: false,
      hasTrailingTextButton: false,
    });

    expect(withActionButton).toBe(true);
    expect(withoutActionButton).toBe(false);
  });
});
