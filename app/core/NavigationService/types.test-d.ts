import type { AppNavigationProp } from './types';

declare const navigation: AppNavigationProp;

// Valid route — must compile.
navigation.navigate('WalletView');

// Invalid route — must be a type error. If this line ever compiles,
// the @ts-expect-error becomes "unused" and tsc fails: the regression guard.
// @ts-expect-error invalid route name must not be allowed
navigation.navigate('THISISATEST');

// Wrong params for a known route — must error.
// @ts-expect-error invalid param shape
navigation.navigate('CardAuthentication', { bogus: true });
