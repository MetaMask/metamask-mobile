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
    paddingVertical: 14,
    gap: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectAllContainer: {
    width: 24,
    alignItems: 'center',
  },
  separator: {
    height: 2,
  },
  sectionSeparator: {
    height: 1,
    marginHorizontal: 16,
  },
  collapsedHint: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
});

type SectionKey = 'malicious' | 'open';

interface RiskSection {
  key: SectionKey;
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
  SectionKey,
  {
    titleKey: string;
    iconName?: IconName;
    iconColor?: IconColor;
    collapsible: boolean;
  }
> = {
  malicious: {
    titleKey: 'token_approvals.section_malicious',
    iconName: IconName.Danger,
    iconColor: IconColor.Warning,
    collapsible: true,
  },
  open: {
    titleKey: 'token_approvals.section_benign',
    collapsible: false,
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
    const malicious: ApprovalItem[] = [];
    const open: ApprovalItem[] = [];

    for (const a of approvals) {
      if (a.verdict === Verdict.Malicious) {
        malicious.push(a);
      } else {
        open.push(a);
      }
    }

    const result: RiskSection[] = [];

    if (malicious.length > 0) {
      result.push({
        key: 'malicious',
        title: strings(SECTION_CONFIG.malicious.titleKey),
        data: malicious,
      });
    }

    if (open.length > 0) {
      result.push({
        key: 'open',
        title: strings(SECTION_CONFIG.open.titleKey),
        data: open,
      });
    }

    return result;
  }, [approvals]);

  const [collapsedSections, setCollapsedSections] = useState<
    Record<string, boolean>
  >({});

  const toggleSection = useCallback((key: SectionKey) => {
    if (!SECTION_CONFIG[key].collapsible) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }, []);

  const handleSelectAllInSection = useCallback(
    (sectionData: ApprovalItem[]) => {
      const sectionIds = sectionData.map((a) => a.id);
      const allAlreadySelected = sectionIds.every((id) =>
        selectedIds.includes(id),
      );

      if (allAlreadySelected) {
        const remaining = selectedIds.filter((id) => !sectionIds.includes(id));
        onSelectAll(remaining);
      } else {
        const merged = [...new Set([...selectedIds, ...sectionIds])];
        onSelectAll(merged);
      }
    },
    [onSelectAll, selectedIds],
  );

  const renderItem = useCallback(
    ({ item, section }: { item: ApprovalItem; section: RiskSection }) => {
      if (collapsedSections[section.key]) {
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
      const config = SECTION_CONFIG[section.key];
      const isCollapsed = collapsedSections[section.key] ?? false;

      const sectionIds = section.data.map((a) => a.id);
      const allSelected =
        sectionIds.length > 0 &&
        sectionIds.every((id) => selectedIds.includes(id));

      return (
        <View>
          <View
            style={[
              styles.sectionSeparator,
              { backgroundColor: colors.border.muted },
            ]}
          />
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => toggleSection(section.key)}
            activeOpacity={config.collapsible ? 0.7 : 1}
            accessibilityRole="button"
            accessibilityLabel={`${section.title}, ${section.data.length} items, ${isCollapsed ? 'collapsed' : 'expanded'}`}
          >
            {/* Section checkbox */}
            <View style={styles.selectAllContainer}>
              <Checkbox
                isChecked={allSelected}
                onPress={() => handleSelectAllInSection(section.data)}
              />
            </View>

            {/* Title and count */}
            <View style={styles.sectionTitleRow}>
              <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
                {section.title} ({section.data.length})
              </Text>
            </View>

            {/* Right side: warning icon + chevron */}
            <View style={styles.sectionHeaderRight}>
              {config.iconName && config.iconColor && (
                <Icon
                  name={config.iconName}
                  size={IconSize.Sm}
                  color={config.iconColor}
                />
              )}
              {config.collapsible && (
                <Icon
                  name={isCollapsed ? IconName.ArrowRight : IconName.ArrowUp}
                  size={IconSize.Sm}
                  color={IconColor.Muted}
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      );
    },
    [
      collapsedSections,
      colors,
      selectedIds,
      toggleSection,
      handleSelectAllInSection,
    ],
  );

  const renderSectionFooter = useCallback(
    ({ section }: { section: RiskSection }) => {
      if (!collapsedSections[section.key]) return null;
      return (
        <TouchableOpacity
          style={styles.collapsedHint}
          onPress={() => toggleSection(section.key)}
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
