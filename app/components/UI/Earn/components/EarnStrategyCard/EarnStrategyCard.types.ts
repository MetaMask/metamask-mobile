import { IconName } from '@metamask/design-system-react-native';
import type {
  EarnExperience,
  EarnExperienceType,
} from '../../types/earnAssets';

export enum EarnStrategyCardVariant {
  Primary = 'primary',
  Secondary = 'secondary',
}

export type MoneyAccountDepositExperience = EarnExperience & {
  type: 'MONEY_ACCOUNT_DEPOSIT';
};

export type NonMoneyAccountExperience = EarnExperience & {
  type: Exclude<EarnExperienceType, 'MONEY_ACCOUNT_DEPOSIT'>;
};

interface EarnStrategyCardInfoRow {
  id: string;
  text: string;
  icon: IconName;
}

interface EarnStrategyCardSharedProps {
  title: string;
  subtitle?: string;
  infoRows?: readonly EarnStrategyCardInfoRow[];
  isActive: boolean;
  onPress: () => void;
  testID?: string;
}

export type EarnStrategyCardProps =
  | (EarnStrategyCardSharedProps & {
      variant: EarnStrategyCardVariant.Primary;
      experience: MoneyAccountDepositExperience;
    })
  | (EarnStrategyCardSharedProps & {
      variant: EarnStrategyCardVariant.Secondary;
      experience: NonMoneyAccountExperience;
    });
