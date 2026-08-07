import Matchers from '../../framework/Matchers';
import { SpendingLimitSelectors } from '../../../app/components/UI/Card/Views/SpendingLimit/SpendingLimit.testIds';
import { EncapsulatedElementType } from '../../framework';

class SpendingLimitView {
  get tokenRow(): EncapsulatedElementType {
    return Matchers.getElementByID(SpendingLimitSelectors.TOKEN_ROW);
  }

  get spendingLimitRow(): EncapsulatedElementType {
    return Matchers.getElementByID(SpendingLimitSelectors.SPENDING_LIMIT_ROW);
  }

  get accountRow(): EncapsulatedElementType {
    return Matchers.getElementByID(SpendingLimitSelectors.ACCOUNT_ROW);
  }
}

export default new SpendingLimitView();
