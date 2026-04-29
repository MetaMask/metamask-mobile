import React, { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Box,
  Button,
  ButtonSize,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { MoneyFooterTestIds } from './MoneyFooter.testIds';
import createStyles from './MoneyFooter.styles';

interface MoneyFooterProps {
  onAddMoneyPress?: () => void;
}

const MoneyFooter = ({
  onAddMoneyPress = () => undefined,
}: MoneyFooterProps) => {
  const { bottom } = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(bottom), [bottom]);

  return (
    <Box
      twClassName="px-4 pt-4 bg-default"
      style={styles.container}
      testID={MoneyFooterTestIds.CONTAINER}
    >
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
};

export default MoneyFooter;
