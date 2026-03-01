import { Platform } from 'react-native';
import Pusher from 'pusher-js/react-native';
import { ControllerInitFunction } from '../../types';
import {
  TransakService,
  TransakServiceMessenger,
  TransakEnvironment,
  type PusherFactory,
} from '@metamask/ramps-controller';

export function getTransakEnvironment(): TransakEnvironment {
  const metamaskEnvironment = process.env.METAMASK_ENVIRONMENT;
  switch (metamaskEnvironment) {
    case 'production':
    case 'beta':
    case 'rc':
      return TransakEnvironment.Production;

    case 'dev':
    case 'exp':
    case 'test':
    case 'e2e':
    default:
      return TransakEnvironment.Staging;
  }
}

function getTransakContext(): string {
  return Platform.OS === 'ios' ? 'mobile-ios' : 'mobile-android';
}

const createPusher: PusherFactory = (key, options) => new Pusher(key, options);

export const transakServiceInit: ControllerInitFunction<
  TransakService,
  TransakServiceMessenger
> = ({ controllerMessenger }) => {
  const service = new TransakService({
    messenger: controllerMessenger,
    environment: getTransakEnvironment(),
    context: getTransakContext(),
    fetch,
    createPusher,
  });

  return {
    controller: service,
  };
};
