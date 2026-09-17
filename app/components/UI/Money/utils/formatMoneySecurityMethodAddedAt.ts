import { strings } from '../../../../../locales/i18n';

const SHORT_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export const formatMoneySecurityMethodAddedAt = (date: Date) => {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const twelveHour = hours % 12 || 12;

  return strings('money.security.method_added_at', {
    date: `${SHORT_MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`,
    time: `${twelveHour}:${minutes} ${period}`,
  });
};
