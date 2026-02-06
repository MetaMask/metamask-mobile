export enum ConfirmationLoader {
  Default = 'default',
  CustomAmount = 'customAmount',
  PredictClaim = 'predictClaim',
  Transfer = 'transfer',
}

export interface ConfirmationParams {
  loader?: ConfirmationLoader;
  maxValueMode?: boolean;
}
