import React from 'react';
import { FlatList, useWindowDimensions } from 'react-native';
import { typography } from '@metamask/design-tokens';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Skeleton,
  Text,
  TextColor,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import type { CollectiblesPack } from '../../types';
import { useCollectiblesPresentation } from '../../hooks/useCollectiblesPresentation';
import PackCard, { type PackCardProps } from '../PackCard';
import PackCardSkeleton from '../PackCard/PackCardSkeleton';
import ErrorPanel from '../ErrorPanel';

interface PackListProps {
  packs: CollectiblesPack[];
  onOpen: PackCardProps['onOpen'];
  onBuy?: PackCardProps['onBuy'];
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  variant?: PackCardProps['variant'];
  tileWidth?: number;
  horizontalInset?: number;
  testID?: string;
  getOpenedLast7d?: (pack: CollectiblesPack) => number | undefined;
  renderSocialContext?: (pack: CollectiblesPack) => React.ReactNode;
  renderFooter?: (pack: CollectiblesPack) => React.ReactNode;
}

/** Shared virtualized pack row. Screens supply data and navigation, not list states. */
const PackList = ({
  packs,
  onOpen,
  onBuy,
  isLoading = false,
  error = false,
  onRetry,
  variant = 'compact',
  tileWidth: suppliedTileWidth,
  horizontalInset = 16,
  testID = 'collectibles-pack-list',
  getOpenedLast7d,
  renderSocialContext,
  renderFooter,
}: PackListProps): React.JSX.Element | null => {
  const tw = useTailwind();
  const { fontScale, width } = useWindowDimensions();
  const tileWidth = suppliedTileWidth ?? width / 2 - 14;
  const { online, previewCount } = useCollectiblesPresentation();
  if (!online) return null;
  if (isLoading) {
    return (
      <Box
        twClassName="flex-row gap-4 overflow-hidden pb-2"
        style={{ paddingHorizontal: horizontalInset }}
        testID={`${testID}-loading`}
      >
        {[0, 1, 2].map((index) => (
          <Box key={index} style={{ width: tileWidth }} gap={2}>
            <PackCardSkeleton
              variant={variant}
              withPurchase={Boolean(onBuy)}
              withSocialContext={Boolean(renderSocialContext)}
            />
            {renderFooter && (
              <Skeleton
                height={typography.sBodyXS.lineHeight * fontScale}
                width="65%"
              />
            )}
          </Box>
        ))}
      </Box>
    );
  }
  if (error) {
    return (
      <ErrorPanel
        title={strings('collectibles.packs.error')}
        onRetry={onRetry}
      />
    );
  }
  return (
    <FlatList
      horizontal
      data={packs}
      keyExtractor={(pack) => pack.code}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('gap-4 pb-2', {
        paddingHorizontal: horizontalInset,
      })}
      initialNumToRender={previewCount}
      maxToRenderPerBatch={previewCount}
      windowSize={3}
      testID={testID}
      ListEmptyComponent={
        <Text color={TextColor.TextAlternative} testID={`${testID}-empty`}>
          {strings('collectibles.packs.empty')}
        </Text>
      }
      renderItem={({ item }) => (
        <Box style={{ width: tileWidth }} gap={2}>
          <PackCard
            pack={item}
            variant={variant}
            onOpen={onOpen}
            onBuy={onBuy}
            openedLast7d={getOpenedLast7d?.(item)}
            socialContext={
              renderSocialContext ? (
                <Box
                  style={{
                    minHeight: Math.max(
                      24,
                      typography.sBodyXS.lineHeight * fontScale,
                    ),
                  }}
                >
                  {renderSocialContext(item)}
                </Box>
              ) : undefined
            }
          />
          {renderFooter && (
            <Box
              style={{ minHeight: typography.sBodyXS.lineHeight * fontScale }}
            >
              {renderFooter(item)}
            </Box>
          )}
        </Box>
      )}
    />
  );
};

export default PackList;
