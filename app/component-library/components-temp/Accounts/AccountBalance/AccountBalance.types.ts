import { AccountBaseProps } from '../AccountBase/AccountBase.types';
// External dependencies.
import { BadgeProps } from '../../../components/Badges/Badge/Badge.types';

export interface AccountBalanceProps extends AccountBaseProps {
  badgeProps?: BadgeProps;
}
