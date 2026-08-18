import { useContext } from 'react';
import { QuickBuyContext, type QuickBuyContextValue } from './QuickBuyContext';

export function useQuickBuyContext(): QuickBuyContextValue {
  const context = useContext(QuickBuyContext);

  if (!context) {
    throw new Error(
      'QuickBuy compound components must be rendered within QuickBuy.Root',
    );
  }

  return context;
}
