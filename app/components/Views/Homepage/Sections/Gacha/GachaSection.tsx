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
import { selectGachaEnabledFlag } from '../../../../UI/Gacha';
import { GachaSectionTestIds } from './GachaSection.testIds';

interface GachaSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

/** Homepage entry point, shown only when the remote feature flag is enabled. */
const GachaSection = forwardRef<SectionRefreshHandle, GachaSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation<AppNavigationProp>();
    const isEnabled = useSelector(selectGachaEnabledFlag);

    const openPacks = () => {
      navigation.navigate(Routes.GACHA.ROOT, {
        screen: Routes.GACHA.HOME,
        params: { initialTab: 'packs' },
      });
    };

    useImperativeHandle(ref, () => ({ refresh: () => Promise.resolve() }), []);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: isEnabled ? sectionViewRef : null,
      isLoading: false,
      sectionName: HomeSectionNames.GACHA,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: true,
      itemCount: 0,
      fireImmediateWhenNoView: false,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.GACHA,
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
        testID={GachaSectionTestIds.CONTAINER}
      >
        <SectionDivider />
        <SectionHeader
          title={strings('gacha.title')}
          isInteractive
          onPress={openPacks}
          testID={homepageSectionTitleTestId(HomeSectionNames.GACHA)}
        />
        <SectionRow gap={3}>
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {strings('gacha.home_section.empty')}
          </Text>
          <Button onPress={openPacks} testID={GachaSectionTestIds.EMPTY_CTA}>
            {strings('gacha.home_section.open_pack')}
          </Button>
        </SectionRow>
      </Box>
    );
  },
);

export default GachaSection;
