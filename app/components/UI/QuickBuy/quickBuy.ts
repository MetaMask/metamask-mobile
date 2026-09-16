import QuickBuyAmount from './QuickBuyAmount';
import QuickBuyAmountScreen from './QuickBuyAmountScreen';
import QuickBuyRoot from './QuickBuyRoot';
import QuickBuyActionFooter from './components/QuickBuyActionFooter';
import QuickBuyToolbar from './components/QuickBuyToolbar';

export const QuickBuy = {
  Root: QuickBuyRoot,
  AmountScreen: QuickBuyAmountScreen,
  Toolbar: QuickBuyToolbar,
  Amount: QuickBuyAmount,
  Footer: QuickBuyActionFooter,
} as const;
