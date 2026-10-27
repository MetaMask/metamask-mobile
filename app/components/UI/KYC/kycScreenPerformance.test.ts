import { AppState } from 'react-native';
import {
  getVbaCufLifecycleContext,
  resetVbaCufLifecycleContextForTests,
} from '../Ramp/Views/VirtualBankAccount/vbaCufLifecycle';
import { VBA_CUF_LIFECYCLE_CONTEXT } from '../Ramp/Views/VirtualBankAccount/vbaCufTags';
import { KYC_SCREEN_PERFORMANCE_CONFIG } from './kycScreenPerformance';

describe('KYC_SCREEN_PERFORMANCE_CONFIG', () => {
  beforeEach(() => {
    resetVbaCufLifecycleContextForTests();
    Object.defineProperty(AppState, 'currentState', {
      configurable: true,
      value: 'active',
    });
    jest
      .spyOn(AppState, 'addEventListener')
      .mockReturnValue({ remove: jest.fn() });
  });

  afterEach(() => {
    resetVbaCufLifecycleContextForTests();
    jest.restoreAllMocks();
  });

  it('adds the VBA lifecycle context to KYC screen traces', () => {
    const expectedContext = getVbaCufLifecycleContext();

    const tags = KYC_SCREEN_PERFORMANCE_CONFIG.getAdditionalTags();

    expect(tags).toStrictEqual({
      lifecycle_context: expectedContext,
    });
    expect(expectedContext).toBe(VBA_CUF_LIFECYCLE_CONTEXT.COLD_PROCESS);
  });
});
