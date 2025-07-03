/* eslint-disable no-empty-function */
import React, { memo } from 'react';
import { ScrollView } from 'react-native';
import createStyles from './styles';
import { mapTokenBalancesToTokenKeys } from '../../card.utils';
import { useTheme } from '../../../../../util/theme';
import { TokenList } from '../../../Tokens/TokenList';
import { TokenConfig } from '../../types';

export interface CardAssetListProps {
  tokenBalances: TokenConfig[];
  refreshing: boolean;
  onRefresh: () => void;
}

const CardAssetList: React.FC<CardAssetListProps> = memo(
  ({ tokenBalances, refreshing, onRefresh }) => {
    const { colors } = useTheme();
    const styles = createStyles(colors);
    const tokenKeys = mapTokenBalancesToTokenKeys(tokenBalances);

    return (
      <ScrollView style={styles.wrapper}>
        <TokenList
          tokenKeys={tokenKeys}
          refreshing={refreshing}
          isAddTokenEnabled={false}
          onRefresh={onRefresh}
          showRemoveMenu={() => {}}
          goToAddToken={() => {}}
          setShowScamWarningModal={() => {}}
          showAddToken={false}
        />
      </ScrollView>
    );
  },
);

CardAssetList.displayName = 'CardAssetList';

export default CardAssetList;
