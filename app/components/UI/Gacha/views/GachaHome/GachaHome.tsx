import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  type RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { Box, HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import { TabsBar } from '../../../../../component-library/components-temp/Tabs';
import { GachaHomeTestIds } from '../../Gacha.testIds';
import type { GachaStackParamList } from '../../types/navigation';
import CardsTab from './CardsTab';
import PacksTab from './PacksTab';

/** Gacha entry screen with Packs and My cards tabs. */
const GachaHome = () => {
  const tw = useTailwind();
  const navigation = useNavigation<AppNavigationProp>();
  const { params } = useRoute<RouteProp<GachaStackParamList, 'GachaHome'>>();
  const [activeIndex, setActiveIndex] = useState(
    params?.initialTab === 'cards' ? 1 : 0,
  );

  useEffect(() => {
    setActiveIndex(params?.initialTab === 'cards' ? 1 : 0);
  }, [params]);

  const tabs = [
    {
      key: 'packs',
      label: strings('gacha.tabs.packs'),
      content: null,
      testID: GachaHomeTestIds.PACKS_TAB,
    },
    {
      key: 'cards',
      label: strings('gacha.tabs.cards'),
      content: null,
      testID: GachaHomeTestIds.CARDS_TAB,
    },
  ];

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={GachaHomeTestIds.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title={strings('gacha.title')}
        onBack={() => navigation.goBack()}
        backButtonProps={{ testID: GachaHomeTestIds.BACK_BUTTON }}
      />
      <TabsBar
        tabs={tabs}
        activeIndex={activeIndex}
        onTabPress={setActiveIndex}
        testID={GachaHomeTestIds.TABS}
      />
      <Box twClassName="flex-1" paddingTop={3}>
        {activeIndex === 0 ? <PacksTab /> : <CardsTab />}
      </Box>
    </SafeAreaView>
  );
};

export default GachaHome;
