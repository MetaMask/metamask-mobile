import { formatDate, formatNotificationTitle } from '.';

describe('formatDate', () => {
  const realDateNow = Date.now.bind(global.Date);

  beforeEach(() => {
    global.Date.now = jest.fn(() => new Date('2024-05-10T12:00:00Z').getTime());
  });

  afterEach(() => {
    global.Date.now = realDateNow;
  });

  it('returns "Yesterday" if the date is from yesterday', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60);
    expect(formatDate(yesterday)).toBe('Yesterday');
  });

  it('returns formatted date as "May 8" if the date is earlier this year but not yesterday', () => {
    const earlierThisYear = new Date('2024-05-08T12:00:00Z');
    expect(formatDate(earlierThisYear)).toBe('May 8');
  });

  it('returns formatted date with year if the date is from a previous year', () => {
    const lastYear = new Date('2023-12-25T12:00:00Z');
    expect(formatDate(lastYear)).toBe('Dec 25');
  });

  it('removes the first word and returns the rest in lowercase', () => {
    const title = 'ERROR_Unexpected_Error_Occurred';
    expect(formatNotificationTitle(title)).toBe('unexpected_error_occurred');
  });

  it('returns an empty string if only one word is present', () => {
    const title = 'ERROR';
    expect(formatNotificationTitle(title)).toBe('');
  });

  it('returns an empty string if the original string is empty', () => {
    const title = '';
    expect(formatNotificationTitle(title)).toBe('');
  });

  it('handles strings with multiple leading underscores', () => {
    const title = '__Sending_ETH_';
    expect(formatNotificationTitle(title)).toBe('_sending_eth_');
  });

  it('processes case sensitivity by converting to lowercase', () => {
    const title = 'ETH_Received_Completed';
    expect(formatNotificationTitle(title)).toBe('received_completed');
  });
});
