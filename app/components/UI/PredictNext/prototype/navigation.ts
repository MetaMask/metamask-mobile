import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ProtoEvent } from './fixtures';

export const ProtoRoutes = {
  FEED: 'PredictProtoFeed',
  GAME: 'PredictProtoGame',
  STANDARD: 'PredictProtoStandard',
  CRYPTO: 'PredictProtoCrypto',
  POSITIONS: 'PredictProtoPositions',
  CATEGORY: 'PredictProtoCategory',
} as const;

export interface ProtoEventParams {
  eventId: string;
}

export interface ProtoCategoryParams {
  category: string;
}

// ParamListBase requires a type alias.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ProtoStackParamList = {
  [ProtoRoutes.FEED]: undefined;
  [ProtoRoutes.GAME]: ProtoEventParams;
  [ProtoRoutes.STANDARD]: ProtoEventParams;
  [ProtoRoutes.CRYPTO]: ProtoEventParams;
  [ProtoRoutes.POSITIONS]: undefined;
  [ProtoRoutes.CATEGORY]: ProtoCategoryParams;
};

export const useProtoNavigation = () =>
  useNavigation<NativeStackNavigationProp<ProtoStackParamList>>();

export const useOpenEvent = () => {
  const navigation = useProtoNavigation();
  return useCallback(
    (event: ProtoEvent) => {
      const route =
        event.kind === 'game'
          ? ProtoRoutes.GAME
          : event.kind === 'crypto'
            ? ProtoRoutes.CRYPTO
            : ProtoRoutes.STANDARD;
      navigation.push(route, { eventId: event.id });
    },
    [navigation],
  );
};

export const useOpenCategory = () => {
  const navigation = useProtoNavigation();
  return useCallback(
    (category: string) => navigation.push(ProtoRoutes.CATEGORY, { category }),
    [navigation],
  );
};
