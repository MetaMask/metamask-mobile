import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import {
  BottomSheet,
  BottomSheetHeader,
  Box,
  FilterButton,
  SegmentedControl,
  SegmentedControlSize,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useTheme } from '../../../../util/theme';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import { useComposerSharePositions } from './useComposerSharePositions';
import PositionRow from '../TraderProfileView/components/PositionRow';
import { PositionRowSkeleton } from '../TraderProfileView/components/Skeletons';
import { isPerpPosition } from '../utils/perp';
import { SharePositionBottomSheetSelectorsIDs } from './SharePositionBottomSheet.testIds';

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});

const SKELETON_KEYS = ['s1', 's2', 's3', 's4'] as const;

export interface SharePositionBottomSheetProps {
  onSelect: (position: Position, isClosed: boolean) => void;
  onClose: () => void;
}

const SharePositionBottomSheet: React.FC<SharePositionBottomSheetProps> = ({
  onSelect,
  onClose,
}) => {
  const { colors } = useTheme();
  const address =
    useSelector(selectSelectedInternalAccountFormattedAddress) ?? '';
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    error,
    refetch,
  } = useComposerSharePositions(address);

  const isLoading = tab === 'open' ? isLoadingOpen : isLoadingClosed;
  const positions = tab === 'open' ? openPositions : closedPositions;
  const bothEmpty =
    !isLoadingOpen &&
    !isLoadingClosed &&
    openPositions.length === 0 &&
    closedPositions.length === 0;

  const openTokens = useMemo(
    () => openPositions.filter((position) => !isPerpPosition(position)),
    [openPositions],
  );
  const openPerps = useMemo(
    () => openPositions.filter((position) => isPerpPosition(position)),
    [openPositions],
  );

  const handleTabChange = useCallback((value: string) => {
    setTab(value === 'closed' ? 'closed' : 'open');
  }, []);

  const handleSelect = useCallback(
    (position: Position) => {
      onSelect(position, tab === 'closed');
    },
    [onSelect, tab],
  );

  const emptyMessage = bothEmpty
    ? strings('social_leaderboard.composer.empty_description')
    : tab === 'open'
      ? strings('social_leaderboard.composer.empty_open')
      : strings('social_leaderboard.composer.empty_closed');

  const renderOpenSections = () => (
    <>
      {openTokens.length > 0 ? (
        <Box testID={SharePositionBottomSheetSelectorsIDs.TOKENS_SECTION}>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextMuted}
            twClassName="px-4 pt-2 pb-1"
          >
            {strings('social_leaderboard.composer.section_tokens')}
          </Text>
          {openTokens.map((position) => (
            <PositionRow
              key={position.positionId}
              position={position}
              isClosed={false}
              onPress={handleSelect}
            />
          ))}
        </Box>
      ) : null}
      {openPerps.length > 0 ? (
        <Box testID={SharePositionBottomSheetSelectorsIDs.PERPS_SECTION}>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextMuted}
            twClassName="px-4 pt-2 pb-1"
          >
            {strings('social_leaderboard.composer.section_perps')}
          </Text>
          {openPerps.map((position) => (
            <PositionRow
              key={position.positionId}
              position={position}
              isClosed={false}
              onPress={handleSelect}
            />
          ))}
        </Box>
      ) : null}
    </>
  );

  const renderClosedList = () =>
    closedPositions.map((position) => (
      <PositionRow
        key={position.positionId}
        position={position}
        isClosed
        showTradeDate
        onPress={handleSelect}
      />
    ));

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <Box twClassName="absolute inset-0">
            <Pressable
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.overlay.default },
              ]}
              onPress={onClose}
              accessibilityRole="button"
              testID={SharePositionBottomSheetSelectorsIDs.BACKDROP}
            />
            <BottomSheet
              onClose={onClose}
              testID={SharePositionBottomSheetSelectorsIDs.SHEET}
            >
              <BottomSheetHeader
                onClose={onClose}
                closeButtonProps={{
                  testID: SharePositionBottomSheetSelectorsIDs.CLOSE_BUTTON,
                }}
              >
                {strings('social_leaderboard.composer.share_position_title')}
              </BottomSheetHeader>
              <Box twClassName="px-4 pb-3">
                <SegmentedControl
                  value={tab}
                  onChange={handleTabChange}
                  size={SegmentedControlSize.Md}
                >
                  <FilterButton
                    value="open"
                    testID={SharePositionBottomSheetSelectorsIDs.OPEN_TAB}
                  >
                    {strings('social_leaderboard.composer.tab_open')}
                  </FilterButton>
                  <FilterButton
                    value="closed"
                    testID={SharePositionBottomSheetSelectorsIDs.CLOSED_TAB}
                  >
                    {strings('social_leaderboard.composer.tab_closed')}
                  </FilterButton>
                </SegmentedControl>
              </Box>
              <ScrollView>
                {error && positions.length === 0 ? (
                  <Box
                    twClassName="px-4 py-8 items-center gap-2"
                    testID={SharePositionBottomSheetSelectorsIDs.ERROR}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextDefault}
                    >
                      {strings('social_leaderboard.composer.error_title')}
                    </Text>
                    <TextButton
                      onPress={() => {
                        refetch().catch(() => undefined);
                      }}
                      testID={SharePositionBottomSheetSelectorsIDs.RETRY}
                    >
                      {strings('social_leaderboard.composer.retry')}
                    </TextButton>
                  </Box>
                ) : isLoading && positions.length === 0 ? (
                  SKELETON_KEYS.map((key) => <PositionRowSkeleton key={key} />)
                ) : positions.length === 0 ? (
                  <Box
                    twClassName="px-4 py-8"
                    testID={SharePositionBottomSheetSelectorsIDs.EMPTY}
                  >
                    <Text
                      variant={TextVariant.BodyMd}
                      color={TextColor.TextAlternative}
                    >
                      {emptyMessage}
                    </Text>
                  </Box>
                ) : tab === 'open' ? (
                  renderOpenSections()
                ) : (
                  renderClosedList()
                )}
              </ScrollView>
            </BottomSheet>
          </Box>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default SharePositionBottomSheet;
