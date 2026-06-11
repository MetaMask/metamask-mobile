import { strings } from '../../../../../locales/i18n';
import useNavbar from '../../../Views/confirmations/hooks/ui/useNavbar';

export function useMoneyAccountDepositNavbar() {
  useNavbar(strings('confirm.title.money_account_add_money'), true);
}
