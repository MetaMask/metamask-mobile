import { assertNativeRuntimeCompatibility } from './nativeRuntimeCompatibility';

describe('assertNativeRuntimeCompatibility', () => {
  it('accepts a binary with the expected native fingerprint', () => {
    const fingerprint = 'native-fingerprint';

    const validate = () =>
      assertNativeRuntimeCompatibility(fingerprint, fingerprint);

    expect(validate).not.toThrow();
  });

  it('rejects a binary with a different native fingerprint', () => {
    const validate = () =>
      assertNativeRuntimeCompatibility(
        'checkout-fingerprint',
        'binary-fingerprint',
      );

    expect(validate).toThrow(
      'The installed development binary is incompatible with this JavaScript checkout.',
    );
    expect(validate).toThrow('yarn install:ios:dev');
  });

  it('rejects a binary without a native fingerprint', () => {
    const validate = () =>
      assertNativeRuntimeCompatibility('checkout-fingerprint', null);

    expect(validate).toThrow('Installed binary fingerprint: missing');
  });

  it('skips validation when Metro does not provide a fingerprint', () => {
    const validate = () =>
      assertNativeRuntimeCompatibility(undefined, 'binary-fingerprint');

    expect(validate).not.toThrow();
  });
});
