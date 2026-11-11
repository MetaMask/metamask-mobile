import { BrokenCircuitError as ServiceBrokenCircuitError } from '@metamask/base-data-service';
import { BrokenCircuitError } from '@metamask/controller-utils';
import { isCircuitBreakerOpenError } from './isCircuitBreakerOpenError';

describe('isCircuitBreakerOpenError', () => {
  it('recognizes the preview circuit error, which has no errorKey', () => {
    const error = new ServiceBrokenCircuitError();

    expect(error).toBeInstanceOf(BrokenCircuitError);
    expect(error).not.toHaveProperty('errorKey');
    expect(isCircuitBreakerOpenError(error)).toBe(true);
  });

  it('recognizes an OTP error that keeps the class and sets errorKey', () => {
    const error = Object.assign(new BrokenCircuitError(), {
      errorKey: 'CIRCUIT_BREAKER_OPEN',
    });

    expect(isCircuitBreakerOpenError(error)).toBe(true);
  });

  it('recognizes errorKey without the class', () => {
    expect(
      isCircuitBreakerOpenError({ errorKey: 'CIRCUIT_BREAKER_OPEN' }),
    ).toBe(true);
  });

  it('does not treat the circuit breaker sentence alone as an open circuit', () => {
    expect(
      isCircuitBreakerOpenError(
        new Error('Execution prevented because the circuit breaker is open'),
      ),
    ).toBe(false);
  });
});
