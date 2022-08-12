import MetaMetrics from './MetaMetrics';
import { States } from './MetaMetrics.constants';

describe('MetaMetrics', () => {
  it('should disable MetaMetrics', () => {
    MetaMetrics.disable();
    expect(MetaMetrics.state()).toBe(States.disabled);
  });

  it('should enable MetaMetrics', () => {
    MetaMetrics.enable();
    expect(MetaMetrics.state()).toBe(States.enabled);
  });
});
