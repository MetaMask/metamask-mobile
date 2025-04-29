import { RouteProp } from '@react-navigation/native';
import { TokenI } from '../../../Tokens/types';
import { strings } from '../../../../../../locales/i18n';

export enum EARN_INPUT_VIEW_ACTIONS {
  STAKE = 'STAKE',
  LEND = 'LEND',
}

export const EARN_INPUT_ACTION_TO_LABEL_MAP = {
  [EARN_INPUT_VIEW_ACTIONS.STAKE]: strings('stake.stake'),
  [EARN_INPUT_VIEW_ACTIONS.LEND]: strings('stake.deposit'),
};

interface EarnInputViewRouteParams {
  token: TokenI;
  action: EARN_INPUT_VIEW_ACTIONS;
}

export interface EarnInputViewProps {
  route: RouteProp<{ params: EarnInputViewRouteParams }, 'params'>;
}
