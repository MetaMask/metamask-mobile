import Matchers from '../../framework/Matchers';
import { CashbackSelectors } from '../../../app/components/UI/Card/Views/Cashback/Cashback.testIds';
import { EncapsulatedElementType } from '../../framework';

class CashbackView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(CashbackSelectors.CONTAINER);
  }

  get balanceTitle(): EncapsulatedElementType {
    return Matchers.getElementByID(CashbackSelectors.BALANCE_TITLE);
  }

  get withdrawButton(): EncapsulatedElementType {
    return Matchers.getElementByID(CashbackSelectors.WITHDRAW_BUTTON);
  }
}

export default new CashbackView();
