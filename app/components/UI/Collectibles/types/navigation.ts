import Routes from '../../../../constants/navigation/Routes';

export interface CollectiblesPackParams {
  packCode: string;
}

// ParamListBase requires `type`; `interface` cannot satisfy it.
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type CollectiblesStackParamList = {
  [Routes.COLLECTIBLES.HOME]: undefined;
  [Routes.COLLECTIBLES.PACK]: CollectiblesPackParams;
};
