const isOverAnHour = (minutes: number) => minutes > 59;

const isOverADay = (minutes: number) => minutes > 1439;

const toDay = (minutes: number) => Math.round(minutes / 1440);
const toHour = (minutes: number) => Math.round(minutes / 60);

export enum TimeDescriptions {
  instant,
  less_than,
  separator,
  minutes,
  minute,
  hours,
  hour,
  business_days,
  business_day,
}
export const timeToDescription = (timeArr: number[]) => {
  const [lower, upper] = timeArr;
  if (lower === 0 && upper === 0) {
    return [TimeDescriptions.instant];
  }
  if (lower === 0) {
    if (isOverADay(upper)) {
      if (toDay(upper) === 1) {
        return [
          TimeDescriptions.less_than,
          toDay(upper).toString(),
          TimeDescriptions.business_day,
        ];
      }
      return [
        TimeDescriptions.less_than,
        toDay(upper).toString(),
        TimeDescriptions.business_days,
      ];
    } else if (isOverAnHour(upper)) {
      if (toHour(upper) === 1) {
        return [
          TimeDescriptions.less_than,
          toHour(upper).toString(),
          TimeDescriptions.hour,
        ];
      }
      return [
        TimeDescriptions.less_than,
        toHour(upper).toString(),
        TimeDescriptions.hours,
      ];
    }
    if (upper === 1) {
      return [
        TimeDescriptions.less_than,
        upper.toString(),
        TimeDescriptions.minute,
      ];
    }
    return [
      TimeDescriptions.less_than,
      upper.toString(),
      TimeDescriptions.minutes,
    ];
  } else if (isOverADay(lower)) {
    return [
      toDay(lower).toString(),
      TimeDescriptions.separator,
      toDay(upper).toString(),
      TimeDescriptions.business_days,
    ];
  } else if (isOverAnHour(lower)) {
    return [
      toHour(lower).toString(),
      TimeDescriptions.separator,
      toHour(upper).toString(),
      TimeDescriptions.hours,
    ];
  }
  return [
    lower.toString(),
    TimeDescriptions.separator,
    upper.toString(),
    TimeDescriptions.minutes,
  ];
};

export const formatId = (id: string) => {
  if (!id) {
    return id;
  }

  return id.startsWith('/') ? id : '/' + id;
};

export function formatAmount(amount: number) {
  try {
    if (Intl?.NumberFormat) return new Intl.NumberFormat().format(amount);
    return String(amount);
  } catch (e) {
    return String(amount);
  }
}
