import { RouteProp } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';
import { strings } from '../../../../../../locales/i18n';

export enum STAKE_INPUT_VIEW_ACTIONS {
  STAKE = 'STAKE',
  LEND = 'LEND',
}

export const STAKE_INPUT_ACTION_TO_LABEL_MAP = {
  [STAKE_INPUT_VIEW_ACTIONS.STAKE]: strings('stake.stake'),
  [STAKE_INPUT_VIEW_ACTIONS.LEND]: strings('stake.deposit'),
};

interface StakeInputViewRouteParams {
  token: TokenI;
  action: STAKE_INPUT_VIEW_ACTIONS;
}

export interface StakeInputViewProps {
  route: RouteProp<{ params: StakeInputViewRouteParams }, 'params'>;
}
