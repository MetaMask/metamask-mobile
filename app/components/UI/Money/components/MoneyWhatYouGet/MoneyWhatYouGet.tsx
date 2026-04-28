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
import { MoneyWhatYouGetTestIds } from './MoneyWhatYouGet.testIds';

interface MoneyWhatYouGetProps {
  /** APY expressed as a percentage (e.g. 3 for 3%). */
  apy: number;
  /**
   * Handler fired when Learn more is tapped. Opens the marketing page web view.
   */
  onLearnMorePress?: () => void;
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

const MoneyWhatYouGet = ({
  apy,
  onLearnMorePress = () => undefined,
}: MoneyWhatYouGetProps) => (
  <Box twClassName="px-4 py-3" testID={MoneyWhatYouGetTestIds.CONTAINER}>
    <MoneySectionHeader title={strings('money.what_you_get.title')} />

    <Box twClassName="mt-3 mb-3 gap-3">
      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.what_you_get.benefit_auto_earn')}
          <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
            {strings('money.apy_label', { percentage: String(apy) })}
          </Text>
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.what_you_get.benefit_dollar_backed')}
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.what_you_get.benefit_liquidity')}
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.what_you_get.benefit_spend_prefix')}
          <Text variant={TextVariant.BodyMd} color={TextColor.SuccessDefault}>
            {strings('money.what_you_get.benefit_spend_cashback')}
          </Text>
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.what_you_get.benefit_transfer')}
        </Text>
      </BenefitRow>

      <BenefitRow>
        <Text variant={TextVariant.BodyMd}>
          {strings('money.what_you_get.benefit_global')}
        </Text>
      </BenefitRow>
    </Box>

    <Box twClassName="py-3">
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        isFullWidth
        onPress={onLearnMorePress}
        testID={MoneyWhatYouGetTestIds.LEARN_MORE_BUTTON}
      >
        {strings('money.what_you_get.learn_more')}
      </Button>
    </Box>
  </Box>
);

export default MoneyWhatYouGet;
