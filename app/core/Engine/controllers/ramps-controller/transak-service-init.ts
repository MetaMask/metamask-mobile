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

const createPusher: PusherFactory = (key, options) => {
  const pusher = new Pusher(key, options);
  return {
    subscribe(channelName: string) {
      const channel = pusher.subscribe(channelName);
      return {
        bind: channel.bind.bind(channel),
        unbindAll: channel.unbind_all.bind(channel),
      };
    },
    unsubscribe: pusher.unsubscribe.bind(pusher),
    disconnect: pusher.disconnect.bind(pusher),
  };
};

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
