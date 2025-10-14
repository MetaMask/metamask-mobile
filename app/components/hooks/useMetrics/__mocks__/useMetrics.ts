import { MetricsEventBuilder } from '../../../../core/Analytics/MetricsEventBuilder';
import { IUseMetricsHook } from '../useMetrics.types';

const mockTrackEvent = jest.fn();
export const defaultUseMetricMock: IUseMetricsHook = {
  trackEvent: mockTrackEvent,
  createEventBuilder: MetricsEventBuilder.createEventBuilder,
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

export default jest.fn().mockReturnValue(defaultUseMetricMock);
