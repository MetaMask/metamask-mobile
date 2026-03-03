import React, { useCallback } from 'react';
import { FlatList, View, StyleSheet } from 'react-native';
import { ApprovalItem, RevocationStatus } from '../../types';
import ApprovalCard from '../ApprovalCard';

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  separator: {
    height: 2,
  },
});

interface ApprovalsListProps {
  approvals: ApprovalItem[];
  selectedIds: string[];
  revocations: Record<string, RevocationStatus>;
  selectionMode: boolean;
  onApprovalPress: (approval: ApprovalItem) => void;
  onApprovalSelect: (id: string) => void;
  onApprovalRevoke: (approval: ApprovalItem) => void;
  ListHeaderComponent?: React.ReactElement;
}

const ItemSeparator = () => <View style={styles.separator} />;

const ApprovalsList: React.FC<ApprovalsListProps> = ({
  approvals,
  selectedIds,
  revocations,
  selectionMode,
  onApprovalPress,
  onApprovalSelect,
  onApprovalRevoke,
  ListHeaderComponent,
}) => {
  const renderItem = useCallback(
    ({ item }: { item: ApprovalItem }) => (
      <ApprovalCard
        approval={item}
        isSelected={selectedIds.includes(item.id)}
        revocationStatus={revocations[item.id]}
        onPress={onApprovalPress}
        onSelect={onApprovalSelect}
        onRevoke={onApprovalRevoke}
        selectionMode={selectionMode}
      />
    ),
    [
      selectedIds,
      revocations,
      selectionMode,
      onApprovalPress,
      onApprovalSelect,
      onApprovalRevoke,
    ],
  );

  const keyExtractor = useCallback((item: ApprovalItem) => item.id, []);

  return (
    <FlatList
      data={approvals}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={styles.contentContainer}
      removeClippedSubviews
    />
  );
};

export default ApprovalsList;
