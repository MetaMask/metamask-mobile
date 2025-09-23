import { IUseMetricsHook } from '../useMetrics.types';

export const defaultUseMetricMock: IUseMetricsHook = {
  trackEvent: jest.fn(),
  createEventBuilder: jest.fn(),
  enable: jest.fn(),
  addTraitsToUser: jest.fn(),
  createDataDeletionTask: jest.fn(),
  checkDataDeleteStatus: jest.fn(),
  getDeleteRegulationCreationDate: jest.fn(),
  getDeleteRegulationId: jest.fn(),
  isDataRecorded: jest.fn(),
  isEnabled: jest.fn(),
  getMetaMetricsId: jest.fn(),
  enableSocialLogin: jest.fn(),
};

export default {
  es_module: true,
  default: (): IUseMetricsHook => defaultUseMetricMock,
};
