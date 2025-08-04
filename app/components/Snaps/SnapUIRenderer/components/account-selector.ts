import { AccountSelectorElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const accountSelector: UIComponentFactory<AccountSelectorElement> = ({
  element: e,
  form,
}) => ({
  element: 'SnapUIAccountSelector',
  props: {
    id: e.props.name,
    name: e.props.name,
    hideExternalAccounts: e.props.hideExternalAccounts,
    chainIds: e.props.chainIds,
    switchGlobalAccount: e.props.switchGlobalAccount,
    form,
  },
});
