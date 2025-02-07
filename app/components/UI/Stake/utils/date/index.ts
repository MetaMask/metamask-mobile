export const getUTCWeekRange = (date: Date | string) => {
  const startDate = new Date(date);
  const dayOfWeek = startDate.getUTCDay();
  const startOfWeek = new Date(startDate);
  startOfWeek.setUTCDate(startDate.getUTCDate() - ((dayOfWeek + 6) % 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setUTCDate(startOfWeek.getUTCDate() + 6);
  // returns a formatted utc date yyyy-MM-dd
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  return {
    start: formatDate(startOfWeek),
    end: formatDate(endOfWeek),
  };
};
