import React from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../util/theme';

interface ExploreScrollProps {
  refreshing: boolean;
  onRefresh: () => void;
  testID?: string;
  children: React.ReactNode;
}

/**
 * Vertical ScrollView wrapper for an Explore tab body. Owns top/bottom padding and
 * pull-to-refresh wiring; horizontal inset is owned by section headers/content.
 */
const ExploreScroll: React.FC<ExploreScrollProps> = ({
  refreshing,
  onRefresh,
  testID,
  children,
}) => {
  const tw = useTailwind();
  const { colors } = useTheme();

  return (
    <ScrollView
      testID={testID}
      style={tw.style('flex-1 pt-3')}
      contentContainerStyle={tw.style('pb-4')}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.icon.default}
          colors={[colors.primary.default]}
        />
      }
    >
      {children}
    </ScrollView>
  );
};

export default ExploreScroll;
