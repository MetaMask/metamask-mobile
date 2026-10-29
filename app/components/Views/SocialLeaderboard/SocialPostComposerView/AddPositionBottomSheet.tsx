import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  type LayoutChangeEvent,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Position } from '@metamask/social-controllers';
import {
  BottomSheetHeader,
  Box,
  FilterButton,
  FilterButtonGroup,
  FilterButtonSize,
  FilterButtonVariant,
  FontWeight,
  TabEmptyState,
  Text,
  TextButton,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useTraderPositions } from '../TraderProfileView/hooks';
import PositionRow from '../TraderProfileView/components/PositionRow';
import { PositionRowSkeleton } from '../TraderProfileView/components/Skeletons';
import { isPerpPosition } from '../../../UI/SocialFeed/utils/perp';
import { AddPositionBottomSheetSelectorsIDs } from './AddPositionBottomSheet.testIds';
import { ComposerSheetSnap } from './ComposerSheetSnap';
import HiddenPositionInfo from './HiddenPositionInfo';
import { SocialEvent, useSocialScreenAnalytics } from '../analytics';

const { Interaction, Outcome, Screen, Trade } = SocialEvent;
const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
});

const SKELETON_KEYS = ['s1', 's2', 's3', 's4'] as const;

export interface AddPositionBottomSheetProps {
  address: string;
  onSelect: (position: Position, isClosed: boolean) => void;
  onClose: () => void;
}

const AddPositionBottomSheet: React.FC<AddPositionBottomSheetProps> = ({
  address,
  onSelect,
  onClose,
}) => {
  const [tab, setTab] = useState<'open' | 'closed'>('open');
  const [isHiddenPositionInfoOpen, setIsHiddenPositionInfoOpen] =
    useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [filtersHeight, setFiltersHeight] = useState(0);
  const [listHeight, setListHeight] = useState<number | null>(null);
  // Wallet-only PerpsController rows are not included — they have no
  // `positionUid` and cannot be posted.
  const {
    openPositions,
    closedPositions,
    isLoadingOpen,
    isLoadingClosed,
    openError,
    closedError,
    refetch,
  } = useTraderPositions(address);

  const isLoading = tab === 'open' ? isLoadingOpen : isLoadingClosed;
  const positions = tab === 'open' ? openPositions : closedPositions;
  const error = tab === 'open' ? openError : closedError;
  const bothEmpty =
    !isLoadingOpen &&
    !isLoadingClosed &&
    openPositions.length === 0 &&
    closedPositions.length === 0;
  const showPostEmptyCopy = tab === 'open' || bothEmpty;

  const openTokens = useMemo(
    () => openPositions.filter((position) => !isPerpPosition(position)),
    [openPositions],
  );
  const openPerps = useMemo(
    () => openPositions.filter((position) => isPerpPosition(position)),
    [openPositions],
  );
  const trackInteraction = useSocialScreenAnalytics(
    Screen.SHARE_POSITION_SHEET,
    {
      state: [isLoading, Boolean(error), positions.length > 0],
    },
  );

  const handleTabChange = useCallback((value: string) => {
    setTab(value === 'closed' ? 'closed' : 'open');
  }, []);

  const handleHeaderLayout = useCallback((next: number) => {
    setHeaderHeight((current) => (current === next ? current : next));
  }, []);

  const handleFiltersLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.height;
    setFiltersHeight((current) => (current === next ? current : next));
  }, []);

  const handleListContentSize = useCallback((_width: number, next: number) => {
    setListHeight((current) => (current === next ? current : next));
  }, []);

  const defaultHeight =
    headerHeight > 0 && filtersHeight > 0 && listHeight !== null
      ? headerHeight + filtersHeight + listHeight
      : 0;

  const handleClose = useCallback(() => {
    trackInteraction(Interaction.SHEET_DISMISSED, Outcome.DISMISSED);
    onClose();
  }, [onClose, trackInteraction]);

  const handleShowHiddenPositionInfo = useCallback(() => {
    trackInteraction(Interaction.TAP);
    setIsHiddenPositionInfoOpen(true);
  }, [trackInteraction]);

  const handleHideHiddenPositionInfo = useCallback(() => {
    setIsHiddenPositionInfoOpen(false);
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') {
      return undefined;
    }
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (isHiddenPositionInfoOpen) {
          handleHideHiddenPositionInfo();
          return true;
        }
        handleClose();
        return true;
      },
    );
    return () => subscription.remove();
  }, [handleClose, handleHideHiddenPositionInfo, isHiddenPositionInfoOpen]);

  const handleSelect = useCallback(
    (position: Position) => {
      trackInteraction(Interaction.TAP, {
        trade_type: isPerpPosition(position) ? Trade.PERPS : Trade.SPOT,
      });
      onSelect(position, tab === 'closed');
    },
    [onSelect, tab, trackInteraction],
  );

  const renderOpenSections = () => (
    <>
      {openTokens.length > 0 ? (
        <Box testID={AddPositionBottomSheetSelectorsIDs.TOKENS_SECTION}>
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
        <Box testID={AddPositionBottomSheetSelectorsIDs.PERPS_SECTION}>
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
      onRequestClose={
        isHiddenPositionInfoOpen ? handleHideHiddenPositionInfo : handleClose
      }
    >
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <Box twClassName="absolute inset-0">
            <ComposerSheetSnap
              sheetTestID={AddPositionBottomSheetSelectorsIDs.SHEET}
              onDismiss={handleClose}
              defaultHeight={defaultHeight}
              onHeaderLayout={handleHeaderLayout}
              backdropTestID={AddPositionBottomSheetSelectorsIDs.BACKDROP}
              header={
                <BottomSheetHeader
                  onClose={handleClose}
                  closeButtonProps={{
                    testID: AddPositionBottomSheetSelectorsIDs.CLOSE_BUTTON,
                  }}
                >
                  {strings('social_leaderboard.composer.add_position_title')}
                </BottomSheetHeader>
              }
            >
              <>
                <Box twClassName="px-4 pb-3" onLayout={handleFiltersLayout}>
                  <FilterButtonGroup
                    value={tab}
                    onChange={handleTabChange}
                    variant={FilterButtonVariant.Secondary}
                  >
                    <FilterButton
                      value="open"
                      size={FilterButtonSize.Md}
                      testID={AddPositionBottomSheetSelectorsIDs.OPEN_TAB}
                    >
                      {strings('social_leaderboard.composer.tab_open')}
                    </FilterButton>
                    <FilterButton
                      value="closed"
                      size={FilterButtonSize.Md}
                      testID={AddPositionBottomSheetSelectorsIDs.CLOSED_TAB}
                    >
                      {strings('social_leaderboard.composer.tab_closed')}
                    </FilterButton>
                  </FilterButtonGroup>
                </Box>
                <ScrollView
                  style={defaultHeight > 0 ? styles.list : undefined}
                  onContentSizeChange={handleListContentSize}
                >
                  {error && positions.length === 0 ? (
                    <Box
                      twClassName="px-4 py-8 items-center gap-2"
                      testID={AddPositionBottomSheetSelectorsIDs.ERROR}
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
                        testID={AddPositionBottomSheetSelectorsIDs.RETRY}
                      >
                        {strings('social_leaderboard.composer.retry')}
                      </TextButton>
                    </Box>
                  ) : isLoading && positions.length === 0 ? (
                    SKELETON_KEYS.map((key) => (
                      <PositionRowSkeleton key={key} />
                    ))
                  ) : positions.length === 0 ? (
                    <Box twClassName="items-center px-4 py-8">
                      <TabEmptyState
                        description={
                          showPostEmptyCopy
                            ? strings('social_leaderboard.composer.empty_title')
                            : strings(
                                'social_leaderboard.composer.empty_closed',
                              )
                        }
                        descriptionProps={{
                          color: TextColor.TextDefault,
                          fontWeight: FontWeight.Medium,
                        }}
                        twClassName="bg-transparent"
                        testID={AddPositionBottomSheetSelectorsIDs.EMPTY}
                      >
                        {showPostEmptyCopy ? (
                          <TextButton
                            onPress={handleShowHiddenPositionInfo}
                            testID={
                              AddPositionBottomSheetSelectorsIDs.EMPTY_HELP
                            }
                          >
                            {strings('social_leaderboard.composer.empty_help')}
                          </TextButton>
                        ) : null}
                      </TabEmptyState>
                    </Box>
                  ) : tab === 'open' ? (
                    renderOpenSections()
                  ) : (
                    renderClosedList()
                  )}
                </ScrollView>
              </>
            </ComposerSheetSnap>
            {isHiddenPositionInfoOpen ? (
              <HiddenPositionInfo onDismiss={handleHideHiddenPositionInfo} />
            ) : null}
          </Box>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </Modal>
  );
};

export default AddPositionBottomSheet;
