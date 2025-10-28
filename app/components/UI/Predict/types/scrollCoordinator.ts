import { SharedValue } from 'react-native-reanimated';
import { PredictCategory } from './index';

export interface ScrollCoordinator {
  balanceCardOffset: SharedValue<number>;
  balanceCardHeight: SharedValue<number>;
  setBalanceCardHeight: (height: number) => void;
  setCurrentCategory: (category: PredictCategory) => void;
  getTabScrollPosition: (category: PredictCategory) => number;
  setTabScrollPosition: (category: PredictCategory, position: number) => void;
  getScrollHandler: (category: PredictCategory) => unknown;
  isBalanceCardHidden: () => boolean;
  updateBalanceCardHiddenState: (hidden: boolean) => void;
}
