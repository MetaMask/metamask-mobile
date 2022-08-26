import MetaMetrics from './MetaMetrics';
import { States } from './MetaMetrics.types';

describe('MetaMetrics', () => {
  beforeAll(() => {
    MetaMetrics.enable();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should get the correct state of the MetaMetrics instance', () => {
    expect(MetaMetrics.state()).toBe(States.enabled);
  });

  it('should disable MetaMetrics', () => {
    MetaMetrics.disable();
    expect(MetaMetrics.state()).toBe(States.disabled);
  });

  it('should enable MetaMetrics', () => {
    MetaMetrics.enable();
    expect(MetaMetrics.state()).toBe(States.enabled);
  });
});
