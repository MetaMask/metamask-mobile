import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../component-library/components/Texts/Text';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Checkbox from '../../../../../component-library/components/Checkbox';
import { useTheme } from '../../../../../util/theme';
import { strings } from '../../../../../../locales/i18n';
import { ApprovalItem, RevocationStatus, Verdict } from '../../types';
import ApprovalCard from '../ApprovalCard';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const styles = StyleSheet.create({
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  riskIndicator: {
    width: 4,
    height: 28,
    borderRadius: 2,
  },
  sectionTitleColumn: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  selectAllContainer: {
    marginRight: 4,
  },
  separator: {
    height: 2,
  },
  collapsedHint: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
});

interface RiskSection {
  verdict: Verdict;
  title: string;
  data: ApprovalItem[];
}

interface RiskGroupedListProps {
  approvals: ApprovalItem[];
  selectedIds: string[];
  revocations: Record<string, RevocationStatus>;
  selectionMode: boolean;
  onApprovalPress: (approval: ApprovalItem) => void;
  onApprovalSelect: (id: string) => void;
  onApprovalRevoke: (approval: ApprovalItem) => void;
  onSelectAll: (ids: string[]) => void;
  ListHeaderComponent?: React.ReactElement;
}

const SECTION_CONFIG: Record<
  Verdict,
  {
    titleKey: string;
    colorKey: 'error' | 'warning' | 'success' | 'background';
    iconName: IconName;
    iconColor: IconColor;
    textColor: TextColor;
    defaultExpanded: boolean;
  }
> = {
  [Verdict.Malicious]: {
    titleKey: 'token_approvals.section_malicious',
    colorKey: 'error',
    iconName: IconName.Danger,
    iconColor: IconColor.Error,
    textColor: TextColor.Error,
    defaultExpanded: true,
  },
  [Verdict.Warning]: {
    titleKey: 'token_approvals.section_warning',
    colorKey: 'warning',
    iconName: IconName.Warning,
    iconColor: IconColor.Warning,
    textColor: TextColor.Warning,
    defaultExpanded: true,
  },
  [Verdict.Benign]: {
    titleKey: 'token_approvals.section_benign',
    colorKey: 'success',
    iconName: IconName.SecurityTick,
    iconColor: IconColor.Success,
    textColor: TextColor.Success,
    defaultExpanded: true,
  },
  [Verdict.Error]: {
    titleKey: 'token_approvals.section_benign',
    colorKey: 'background',
    iconName: IconName.Info,
    iconColor: IconColor.Muted,
    textColor: TextColor.Alternative,
    defaultExpanded: true,
  },
};

const RiskGroupedList: React.FC<RiskGroupedListProps> = ({
  approvals,
  selectedIds,
  revocations,
  selectionMode,
  onApprovalPress,
  onApprovalSelect,
  onApprovalRevoke,
  onSelectAll,
  ListHeaderComponent,
}) => {
  const { colors } = useTheme();

  const sections = useMemo(() => {
    const groups: Record<Verdict, ApprovalItem[]> = {
      [Verdict.Malicious]: [],
      [Verdict.Warning]: [],
      [Verdict.Benign]: [],
      [Verdict.Error]: [],
    };

    for (const a of approvals) {
      groups[a.verdict].push(a);
    }

    const result: RiskSection[] = [];
    const order = [
      Verdict.Malicious,
      Verdict.Warning,
      Verdict.Benign,
      Verdict.Error,
    ];

    for (const verdict of order) {
      if (groups[verdict].length > 0) {
        result.push({
          verdict,
          title: strings(SECTION_CONFIG[verdict].titleKey),
          data: groups[verdict],
        });
      }
    }

    return result;
  }, [approvals]);

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = useCallback((verdict: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => ({
      ...prev,
      [verdict]: !prev[verdict],
    }));
  }, []);

  const handleSelectAllInSection = useCallback(
    (sectionData: ApprovalItem[]) => {
      const sectionIds = sectionData.map((a) => a.id);
      const allAlreadySelected = sectionIds.every((id) =>
        selectedIds.includes(id),
      );

      if (allAlreadySelected) {
        // Deselect this section's items, keep others
        const remaining = selectedIds.filter((id) => !sectionIds.includes(id));
        onSelectAll(remaining);
      } else {
        // Add all section items to current selection
        const merged = [...new Set([...selectedIds, ...sectionIds])];
        onSelectAll(merged);
      }
    },
    [onSelectAll, selectedIds],
  );

  const renderItem = useCallback(
    ({ item, section }: { item: ApprovalItem; section: RiskSection }) => {
      if (collapsedSections[section.verdict]) {
        return null;
      }
      return (
        <ApprovalCard
          approval={item}
          isSelected={selectedIds.includes(item.id)}
          revocationStatus={revocations[item.id]}
          onPress={onApprovalPress}
          onSelect={onApprovalSelect}
          onRevoke={onApprovalRevoke}
          selectionMode={selectionMode}
        />
      );
    },
    [
      collapsedSections,
      selectedIds,
      revocations,
      selectionMode,
      onApprovalPress,
      onApprovalSelect,
      onApprovalRevoke,
    ],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: RiskSection }) => {
      const config = SECTION_CONFIG[section.verdict];
      const isCollapsed = collapsedSections[section.verdict] ?? false;
      const indicatorColor =
        config.colorKey === 'background'
          ? colors.border.muted
          : colors[config.colorKey].default;
      const badgeBg =
        config.colorKey === 'background'
          ? colors.background.alternative
          : colors[config.colorKey].muted;

      const sectionIds = section.data.map((a) => a.id);
      const allSelected =
        sectionIds.length > 0 &&
        sectionIds.every((id) => selectedIds.includes(id));

      return (
        <View>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(section.verdict)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${section.title}, ${section.data.length} items, ${isCollapsed ? 'collapsed' : 'expanded'}`}
          >
            {selectionMode && (
              <View style={styles.selectAllContainer}>
                <Checkbox
                  isChecked={allSelected}
                  onPress={() => handleSelectAllInSection(section.data)}
                />
              </View>
            )}
            <View
              style={[
                styles.riskIndicator,
                { backgroundColor: indicatorColor },
              ]}
            />
            <View style={styles.sectionTitleColumn}>
              <View style={styles.sectionTitleRow}>
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Default}
                >
                  {section.title}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: badgeBg }]}>
                  <Text variant={TextVariant.BodyXS} color={config.textColor}>
                    {section.data.length}
                  </Text>
                </View>
              </View>
            </View>
            <Icon
              name={isCollapsed ? IconName.ArrowRight : IconName.ArrowDown}
              size={IconSize.Sm}
              color={IconColor.Muted}
            />
          </TouchableOpacity>
        </View>
      );
    },
    [
      collapsedSections,
      colors,
      selectionMode,
      selectedIds,
      toggleSection,
      handleSelectAllInSection,
    ],
  );

  const renderSectionFooter = useCallback(
    ({ section }: { section: RiskSection }) => {
      if (!collapsedSections[section.verdict]) return null;
      return (
        <TouchableOpacity
          style={styles.collapsedHint}
          onPress={() => toggleSection(section.verdict)}
          activeOpacity={0.7}
        >
          <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
            {strings('token_approvals.section_tap_to_expand', {
              count: section.data.length.toString(),
            })}
          </Text>
        </TouchableOpacity>
      );
    },
    [collapsedSections, toggleSection],
  );

  const ItemSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const keyExtractor = useCallback((item: ApprovalItem) => item.id, []);

  return (
    <SectionList
      sections={sections}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      renderSectionFooter={renderSectionFooter}
      keyExtractor={keyExtractor}
      ListHeaderComponent={ListHeaderComponent}
      ItemSeparatorComponent={ItemSeparator}
      contentContainerStyle={styles.contentContainer}
      stickySectionHeadersEnabled={false}
      removeClippedSubviews
    />
  );
};

export default RiskGroupedList;
