import React from 'react';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { useTheme } from '../../../../../util/theme';
import MoneySectionHeader from '../MoneySectionHeader';
import MultichainTransactionListItem from '../../../MultichainTransactionListItem';
import type { MoneyMockTransaction } from '../../constants/mockActivityData';
import { MUSD_TOKEN } from '../../../Earn/constants/musd';
import {
  getMoneyActivityTextStyles,
  getMusdDisplayAmount,
  getMusdFiatAmount,
  moneyActivityItemStyles,
} from '../../constants/activityStyles';
import { MoneyActivityListTestIds } from './MoneyActivityList.testIds';

const MAX_PREVIEW_ITEMS = 5;

interface MoneyActivityListProps {
  transactions: MoneyMockTransaction[];
  onViewAllPress?: () => void;
  onHeaderPress?: () => void;
  navigation: AppNavigationProp;
}

const MoneyActivityList = ({
  transactions,
  onViewAllPress,
  onHeaderPress,
  navigation,
}: MoneyActivityListProps) => {
  const { colors } = useTheme();
  const previewItems = transactions.slice(0, MAX_PREVIEW_ITEMS);

  if (previewItems.length === 0) {
    return null;
  }

  return (
    <Box testID={MoneyActivityListTestIds.CONTAINER}>
      <Box twClassName="px-4 pt-3 pb-1">
        <MoneySectionHeader
          title={strings('money.activity.title')}
          onPress={onHeaderPress}
        />
      </Box>
      {previewItems.map((item, i) => (
        <MultichainTransactionListItem
          key={item.transaction.id}
          transaction={item.transaction}
          chainId={item.chainId}
          navigation={navigation}
          index={i}
          hideDate
          iconSize={40}
          badgePosition={{ bottom: -4, right: -4 }}
          description={item.description}
          tokenIconSource={MUSD_TOKEN.imageSource}
          containerStyle={moneyActivityItemStyles.container}
          hideSubtitle={!item.description}
          textStyles={getMoneyActivityTextStyles(colors, item.transaction.type)}
          displayAmountOverride={getMusdDisplayAmount(item.transaction)}
          fiatAmount={getMusdFiatAmount(item.transaction)}
          hideBorder
        />
      ))}
      {onViewAllPress && (
        <Box twClassName="px-3 my-3">
          <Button
            variant={ButtonVariant.Secondary}
            isFullWidth
            onPress={onViewAllPress}
            testID={MoneyActivityListTestIds.VIEW_ALL_BUTTON}
          >
            {strings('money.activity.view_all')}
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default MoneyActivityList;
