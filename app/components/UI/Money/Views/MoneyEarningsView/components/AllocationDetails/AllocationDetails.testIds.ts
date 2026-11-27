export const AllocationDetailsTestIds = {
  CONTAINER: 'money-allocation-details',
  HEADER: 'money-allocation-details-header',
  LABEL: (key: string): string => `money-allocation-details-label-${key}`,
  VALUE: (key: string): string => `money-allocation-details-value-${key}`,
} as const;
