import React from 'react';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyFooterTestIds } from './MoneyFooter.testIds';

interface MoneyFooterProps {
  onAddMoneyPress?: () => void;
}

const MoneyFooter = ({
  onAddMoneyPress = () => undefined,
}: MoneyFooterProps) => (
  <Box twClassName="px-4 mt-6 mb-6" testID={MoneyFooterTestIds.CONTAINER}>
    <Button
      variant={ButtonVariant.Primary}
      size={ButtonSize.Lg}
      isFullWidth
      onPress={onAddMoneyPress}
      testID={MoneyFooterTestIds.ADD_MONEY_BUTTON}
    >
      {strings('money.footer.add_money')}
    </Button>
  </Box>
);

export default MoneyFooter;
