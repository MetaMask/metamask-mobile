import Matchers from '../../framework/Matchers';
import { CardAuthenticationSelectors } from '../../../app/components/UI/Card/Views/CardAuthentication/CardAuthentication.testIds';
import { type AppiumElement } from '../../framework';

class CardAuthenticationView {
  get countrySelect(): Promise<AppiumElement> {
    return Matchers.getElementByID(CardAuthenticationSelectors.COUNTRY_SELECT);
  }
}

export default new CardAuthenticationView();
