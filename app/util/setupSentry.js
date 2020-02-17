import { init } from '@sentry/react-native';
import { Dedupe, ExtraErrorData } from '@sentry/integrations';

const METAMASK_ENVIRONMENT = process.env['METAMASK_ENVIRONMENT']; // eslint-disable-line dot-notation
const SENTRY_DSN_PROD = 'https://ae39e4b08d464bba9fbf121c85ccfca0@sentry.io/2299799'; // metamask-mobile
const SENTRY_DSN_DEV = 'https://332890de43e44fe2bc070bb18d0934ea@sentry.io/2651591'; // test-metamask-mobile

// Setup sentry remote error reporting
export default function setupSentry() {
	const environment = __DEV__ || !METAMASK_ENVIRONMENT ? 'development' : METAMASK_ENVIRONMENT;
	const dsn = environment === 'production' ? SENTRY_DSN_PROD : SENTRY_DSN_DEV;
	init({
		dsn,
		debug: __DEV__,
		environment,
		integrations: [new Dedupe(), new ExtraErrorData()]
	});
}
