export enum DateRange {
  DAILY = '7D',
  MONTHLY = 'M',
  YEARLY = 'Y',
}

export interface TimePeriodButtonGroupProps {
  onTimePeriodChange?: (timePeriod: DateRange) => void;
  initialTimePeriod: DateRange;
}
