import React, { useEffect, useMemo, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarBaseShape,
  AvatarNetwork,
  AvatarNetworkSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import {
  selectSourceChainRanking,
  selectDestChainRanking,
  selectVisiblePillChainIds,
  setVisiblePillChainIds,
} from '../../../../../core/redux/slices/bridge';
import { CaipChainId } from '@metamask/utils';
import { ScrollView } from 'react-native-gesture-handler';
import ButtonToggle from '../../../../../component-library/components-temp/Buttons/ButtonToggle';
import { ButtonSize } from '../../../../../component-library/components/Buttons/Button';
import { TokenSelectorType } from '../../types';
import { getNetworkImageSource } from '../../../../../util/networks';

/** Maximum number of network pills visible in the horizontal list */
export const MAX_VISIBLE_PILLS = 4;

/** Estimated average pill width (px) for scroll offset calculations */
const PILL_WIDTH = 100;

interface NetworkPillsProps {
  selectedChainId?: CaipChainId;
  onChainSelect: (chainId?: CaipChainId) => void;
  onMorePress: () => void;
  type: TokenSelectorType;
}

interface ChainRankingEntry {
  chainId: CaipChainId;
  name: string;
}

/**
 * Returns the first MAX_VISIBLE_PILLS chain IDs from chainRanking.
 * The ranking order is determined by the feature flag, so the first entries
 * are already the highest-priority networks.
 */
const getVisibleChainIds = (chainRanking: ChainRankingEntry[]): CaipChainId[] =>
  chainRanking.slice(0, MAX_VISIBLE_PILLS).map((c) => c.chainId);

export const NetworkPills: React.FC<NetworkPillsProps> = ({
  selectedChainId,
  onChainSelect,
  onMorePress,
  type,
}) => {
  const tw = useTailwind();
  const dispatch = useDispatch();
  const scrollViewRef = useRef<ScrollView>(null);
  const sourceChainRanking = useSelector(selectSourceChainRanking);
  const destChainRanking = useSelector(selectDestChainRanking);
  const chainRanking: ChainRankingEntry[] =
    type === TokenSelectorType.Source ? sourceChainRanking : destChainRanking;

  // Visible pill chain IDs from Redux (shared across source/dest pickers).
  // Falls back to first N from chainRanking on initial mount.
  const reduxVisibleChainIds = useSelector(selectVisiblePillChainIds);
  const visibleChainIds =
    reduxVisibleChainIds ?? getVisibleChainIds(chainRanking);

  // Resolve visible chains to full entries from chainRanking
  const visibleChains = useMemo(
    () =>
      visibleChainIds
        .map((id) => chainRanking.find((c) => c.chainId === id))
        .filter((c): c is ChainRankingEntry => c !== undefined),
    [visibleChainIds, chainRanking],
  );

  const remainingCount = chainRanking.length - visibleChains.length;

  // When a non-visible network is selected (e.g. from the bottom sheet),
  // push it to the first position and pop the last visible pill.
  // Also scroll the pills to bring the selected network into view.
  //
  // Only `selectedChainId` is listed as a dependency because
  // `visibleChainIds` is derived from Redux state that this effect updates;
  // including it would cause an infinite update loop.
  useEffect(() => {
    if (!selectedChainId) {
      scrollViewRef.current?.scrollTo({ x: 0, animated: true });
      return;
    }

    const existingIndex = visibleChainIds.indexOf(selectedChainId);

    if (existingIndex === -1) {
      // Non-visible network: push to front and scroll to start
      dispatch(
        setVisiblePillChainIds([
          selectedChainId,
          ...visibleChainIds.slice(0, MAX_VISIBLE_PILLS - 1),
        ]),
      );
      scrollViewRef.current?.scrollTo({ x: 0, animated: true });
    } else {
      // Already visible: scroll to bring it into view
      const scrollX = Math.max(0, existingIndex * PILL_WIDTH);
      scrollViewRef.current?.scrollTo({ x: scrollX, animated: true });
    }
  }, [selectedChainId]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderChainPill = (chain: ChainRankingEntry) => {
    const isSelected = selectedChainId === chain.chainId;
    const imageSource = getNetworkImageSource({ chainId: chain.chainId });

    return (
      <ButtonToggle
        key={chain.chainId}
        label={
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            {/* translateY corrects optical misalignment between icon and text
               caused by font line-height metrics */}
            <AvatarNetwork
              src={imageSource}
              size={AvatarNetworkSize.Xs}
              name={chain.name}
              shape={AvatarBaseShape.Square}
              twClassName="rounded translate-y-px"
            />
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={
                isSelected ? TextColor.PrimaryInverse : TextColor.TextDefault
              }
            >
              {chain.name}
            </Text>
          </Box>
        }
        isActive={isSelected}
        onPress={() => onChainSelect(chain.chainId)}
        size={ButtonSize.Md}
        style={tw.style('rounded-xl py-2 px-3')}
      />
    );
  };

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={tw.style('flex-grow-0')}
      contentContainerStyle={tw.style('flex-row items-center gap-2')}
    >
      {/* All CTA - First pill */}
      <ButtonToggle
        label={strings('bridge.all')}
        isActive={!selectedChainId}
        onPress={() => onChainSelect(undefined)}
        style={tw.style('rounded-xl py-2 px-3')}
        size={ButtonSize.Md}
      />
      {visibleChains.map(renderChainPill)}
      {remainingCount > 0 && (
        <ButtonToggle
          label={strings('bridge.more_networks', {
            count: remainingCount,
          })}
          isActive={false}
          onPress={onMorePress}
          style={tw.style('rounded-xl py-2 px-3')}
          size={ButtonSize.Md}
          testID="network-pills-more-button"
        />
      )}
    </ScrollView>
  );
};
