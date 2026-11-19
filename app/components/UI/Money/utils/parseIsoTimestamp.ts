const ISO_CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T/;

export const parseIsoTimestamp = (value: unknown): number | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const calendarDate = ISO_CALENDAR_DATE_PATTERN.exec(value);
  if (!calendarDate) {
    return undefined;
  }

  const year = Number(calendarDate[1]);
  const month = Number(calendarDate[2]);
  const day = Number(calendarDate[3]);
  const calendarTimestamp = Date.UTC(year, month - 1, day);
  const calendar = new Date(calendarTimestamp);
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  ) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
};
