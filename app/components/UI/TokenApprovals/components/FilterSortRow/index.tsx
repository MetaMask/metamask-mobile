import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { VerdictFilter, SortOption } from '../../types';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
});

const VERDICT_FILTERS: VerdictFilter[] = [
  'All',
  'Malicious',
  'Warning',
  'Benign',
];

const SORT_LABELS: Record<SortOption, string> = {
  risk: 'token_approvals.sort_risk',
  value: 'token_approvals.sort_value',
  asset_name: 'token_approvals.sort_name',
};

const SORT_OPTIONS: SortOption[] = ['risk', 'value', 'asset_name'];

interface FilterSortRowProps {
  verdictFilter: VerdictFilter;
  sortBy: SortOption;
  onVerdictFilterChange: (filter: VerdictFilter) => void;
  onSortChange: (sort: SortOption) => void;
}

const FilterSortRow: React.FC<FilterSortRowProps> = ({
  verdictFilter,
  sortBy,
  onVerdictFilterChange,
  onSortChange,
}) => {
  const { colors } = useTheme();

  const handleSortPress = () => {
    const currentIndex = SORT_OPTIONS.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
    onSortChange(SORT_OPTIONS[nextIndex]);
  };

  const getFilterLabel = (filter: VerdictFilter) => {
    switch (filter) {
      case 'All':
        return strings('token_approvals.filter_all');
      case 'Malicious':
        return strings('token_approvals.filter_malicious');
      case 'Warning':
        return strings('token_approvals.filter_warning');
      case 'Benign':
        return strings('token_approvals.filter_benign');
    }
  };

  const getDotColor = (filter: VerdictFilter): string | null => {
    switch (filter) {
      case 'Malicious':
        return colors.error.default;
      case 'Warning':
        return colors.warning.default;
      case 'Benign':
        return colors.success.default;
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {VERDICT_FILTERS.map((filter) => {
          const isActive = verdictFilter === filter;
          const dotColor = getDotColor(filter);
          return (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                {
                  backgroundColor: isActive
                    ? colors.primary.default
                    : colors.background.alternative,
                },
              ]}
              onPress={() => onVerdictFilterChange(filter)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              {dotColor && !isActive && (
                <View style={[styles.dot, { backgroundColor: dotColor }]} />
              )}
              <Text
                variant={TextVariant.BodySM}
                color={isActive ? TextColor.Inverse : TextColor.Default}
              >
                {getFilterLabel(filter)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TouchableOpacity
        style={[
          styles.sortButton,
          { backgroundColor: colors.background.alternative },
        ]}
        onPress={handleSortPress}
        accessibilityRole="button"
        accessibilityLabel={`Sort by ${strings(SORT_LABELS[sortBy])}`}
      >
        <Icon
          name={IconName.SwapVertical}
          size={IconSize.Sm}
          color={IconColor.Default}
        />
        <Text variant={TextVariant.BodySM} color={TextColor.Default}>
          {strings(SORT_LABELS[sortBy])}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default FilterSortRow;
