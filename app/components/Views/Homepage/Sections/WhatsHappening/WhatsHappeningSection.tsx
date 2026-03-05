import React, { forwardRef, useCallback, useImperativeHandle } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box, TextVariant } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import ErrorState from '../../components/ErrorState';
import ViewMoreCard from '../../components/ViewMoreCard';
import FadingScrollContainer from '../../components/FadingScrollContainer';
import { SectionRefreshHandle } from '../../types';
import { selectWhatsHappeningEnabled } from '../../../../../selectors/featureFlagController/whatsHappening';
import { strings } from '../../../../../../locales/i18n';
import { useWhatsHappening } from './hooks';
import { WhatsHappeningCard, WhatsHappeningCardSkeleton } from './components';

const MAX_ITEMS_DISPLAYED = 5;

const CARD_WIDTH = 280;
const GAP = 12;
const PADDING = 16;

const SNAP_OFFSETS = Array.from({ length: MAX_ITEMS_DISPLAYED }, (_, i) =>
  i === 0 ? 0 : PADDING + CARD_WIDTH + (GAP + CARD_WIDTH) * (i - 1),
);

const SKELETON_KEYS = Array.from(
  { length: MAX_ITEMS_DISPLAYED },
  (__, i) => `skeleton-${i}`,
);

interface WhatsHappeningSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const WhatsHappeningSection = forwardRef<
  SectionRefreshHandle,
  WhatsHappeningSectionProps
>(
  (
    { sectionIndex: _sectionIndex, totalSectionsLoaded: _totalSectionsLoaded },
    ref,
  ) => {
    const tw = useTailwind();
    const isEnabled = useSelector(selectWhatsHappeningEnabled);
    const title = strings('homepage.sections.whats_happening');

    const { items, isLoading, error, refresh } =
      useWhatsHappening(MAX_ITEMS_DISPLAYED);

    useImperativeHandle(ref, () => ({ refresh }), [refresh]);

    const handleViewAll = useCallback(() => {
      // TODO: navigate to expanded "What's Happening" view
    }, []);

    if (!isEnabled) {
      return null;
    }

    const hasError = !isLoading && items.length === 0 && error;

    if (hasError) {
      return (
        <Box gap={3}>
          <SectionTitle title={title} onPress={handleViewAll} />
          <ErrorState
            title={strings('homepage.error.unable_to_load', {
              section: title.toLowerCase(),
            })}
            onRetry={refresh}
          />
        </Box>
      );
    }

    if (!isLoading && items.length === 0) {
      return null;
    }

    return (
      <Box gap={3}>
        <SectionTitle title={title} onPress={handleViewAll} />
        <FadingScrollContainer>
          {(scrollProps) => (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw.style('px-4 gap-3')}
              snapToOffsets={SNAP_OFFSETS}
              decelerationRate="fast"
              testID="homepage-whats-happening-carousel"
              {...scrollProps}
            >
              {isLoading ? (
                SKELETON_KEYS.map((key) => (
                  <WhatsHappeningCardSkeleton key={key} />
                ))
              ) : (
                <>
                  {items.map((item) => (
                    <WhatsHappeningCard key={item.id} item={item} />
                  ))}
                  <ViewMoreCard
                    onPress={handleViewAll}
                    twClassName="w-[180px] h-[200px]"
                    textVariant={TextVariant.BodyLg}
                  />
                </>
              )}
            </ScrollView>
          )}
        </FadingScrollContainer>
      </Box>
    );
  },
);

export default WhatsHappeningSection;
