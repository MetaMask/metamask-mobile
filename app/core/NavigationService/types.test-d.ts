import type { AppNavigationProp } from './types';

declare const navigation: AppNavigationProp;

// Valid route — must compile.
navigation.navigate('WalletTabHome');

// Invalid route — must be a type error. If this line ever compiles,
// the @ts-expect-error becomes "unused" and tsc fails: the regression guard.
// @ts-expect-error invalid route name must not be allowed
navigation.navigate('THISISATEST');

// Wrong params for a known route — must error.
// @ts-expect-error invalid param shape
navigation.navigate('CardAuthentication', { bogus: true });

// @ts-expect-error WalletView is the wallet tab key and analytics name
navigation.navigate('WalletView');

// @ts-expect-error BrowserView is the browser tab key and analytics name
navigation.navigate('BrowserView');

// @ts-expect-error WalletTabHome takes the flat wallet params
navigation.navigate('WalletTabHome', { screen: 'WalletView' });
