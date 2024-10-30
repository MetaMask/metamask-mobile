import { captureException } from '@sentry/react-native';

export default function migrate(state: unknown) {
  captureException(new Error('Test'));
  return state;
}
