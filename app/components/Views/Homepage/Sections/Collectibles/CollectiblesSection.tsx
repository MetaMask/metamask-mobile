import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import type { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  SectionDivider,
  SectionHeader,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import SectionRow from '../../components/SectionRow';
import type { SectionRefreshHandle } from '../../types';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { homepageSectionTitleTestId } from '../../Homepage.testIds';
import { selectCollectiblesEnabledFlag } from '../../../../UI/Collectibles';
import { CollectiblesSectionTestIds } from './CollectiblesSection.testIds';

interface CollectiblesSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/** Homepage entry point, shown only when the feature flag is enabled. */
const CollectiblesSection = forwardRef<
  SectionRefreshHandle,
  CollectiblesSectionProps
>(({ sectionIndex, totalSectionsLoaded }, ref) => {
  const sectionViewRef = useRef<View>(null);
  const navigation = useNavigation<AppNavigationProp>();
  const isEnabled = useSelector(selectCollectiblesEnabledFlag);

  const openCollectibles = () => {
    navigation.navigate(Routes.COLLECTIBLES.ROOT, {
      screen: Routes.COLLECTIBLES.HOME,
    });
  };

  useImperativeHandle(ref, () => ({ refresh: () => Promise.resolve() }), []);

  const { onLayout } = useHomeViewedEvent({
    sectionRef: isEnabled ? sectionViewRef : null,
    isLoading: false,
    sectionName: HomeSectionNames.COLLECTIBLES,
    sectionIndex,
    totalSectionsLoaded,
    isEmpty: true,
    itemCount: 0,
    fireImmediateWhenNoView: false,
  });

  useSectionPerformance({
    sectionId: HomeSectionNames.COLLECTIBLES,
    contentReady: true,
    isEmpty: true,
    enabled: isEnabled,
  });

  if (!isEnabled) {
    return null;
  }

  return (
    <Box
      ref={sectionViewRef}
      onLayout={onLayout}
      paddingBottom={3}
      testID={CollectiblesSectionTestIds.CONTAINER}
    >
      <SectionDivider />
      <SectionHeader
        title={strings('collectibles.title')}
        isInteractive
        onPress={openCollectibles}
        testID={homepageSectionTitleTestId(HomeSectionNames.COLLECTIBLES)}
      />
      <SectionRow gap={3}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('collectibles.home_section.description')}
        </Text>
        <Button
          onPress={openCollectibles}
          testID={CollectiblesSectionTestIds.CTA}
        >
          {strings('collectibles.home_section.open_collectibles')}
        </Button>
      </SectionRow>
    </Box>
  );
});

export default CollectiblesSection;
