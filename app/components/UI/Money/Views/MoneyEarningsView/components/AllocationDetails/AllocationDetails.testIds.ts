export const AllocationDetailsTestIds = {
  CONTAINER: 'money-allocation-details',
  HEADER: 'money-allocation-details-header',
  ROW: (key: string): string => `money-allocation-details-row-${key}`,
  LABEL: (key: string): string => `money-allocation-details-label-${key}`,
  VALUE: (key: string): string => `money-allocation-details-value-${key}`,
} as const;
