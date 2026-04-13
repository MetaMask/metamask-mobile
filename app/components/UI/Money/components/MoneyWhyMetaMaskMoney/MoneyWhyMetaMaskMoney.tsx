import React from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonSize,
  ButtonVariant,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import MoneySectionHeader from '../MoneySectionHeader';
import { MoneyWhyMetaMaskMoneyTestIds } from './MoneyWhyMetaMaskMoney.testIds';
import { MUSD_CONVERSION_APY } from '../../../Earn/constants/musd';

interface MoneyWhyMetaMaskMoneyProps {
  onLearnMorePress?: () => void;
  onHeaderPress?: () => void;
}

const BenefitRow = ({ children }: { children: React.ReactNode }) => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Start}
    twClassName="gap-3"
  >
    <Box twClassName="shrink-0 pt-1">
      <Icon
        name={IconName.Check}
        size={IconSize.Sm}
        color={IconColor.SuccessDefault}
      />
    </Box>
    <Box twClassName="flex-1">{children}</Box>
  </Box>
);

const MoneyWhyMetaMaskMoney = ({
  onLearnMorePress = () => undefined,
  onHeaderPress,
}: MoneyWhyMetaMaskMoneyProps) => (
  <Box twClassName="px-4 py-3" testID={MoneyWhyMetaMaskMoneyTestIds.CONTAINER}>
    <MoneySectionHeader
      title={strings('money.why_metamask_money.title')}
      onPress={onHeaderPress}
    />

    <Box twClassName="mt-3 mb-3 gap-3">
      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.why_metamask_money.benefit_auto_earn')}
          <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
            {strings('money.apy_label', {
              percentage: String(MUSD_CONVERSION_APY),
            })}
          </Text>
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.why_metamask_money.benefit_dollar_backed')}
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.why_metamask_money.benefit_liquidity')}
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.why_metamask_money.benefit_spend_prefix')}
          <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
            {strings('money.why_metamask_money.benefit_spend_cashback')}
          </Text>
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.why_metamask_money.benefit_global')}
        </Text>
      </BenefitRow>
    </Box>

    <Box twClassName="py-3">
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onLearnMorePress}
        testID={MoneyWhyMetaMaskMoneyTestIds.LEARN_MORE_BUTTON}
      >
        {strings('money.why_metamask_money.learn_more')}
      </Button>
    </Box>
  </Box>
);

export default MoneyWhyMetaMaskMoney;
