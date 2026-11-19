import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CollectiblesHomeTestIds } from '../../Collectibles.testIds';
import type { CollectiblesStackParamList } from '../../types/navigation';

/** Empty Collectibles entry screen for the module foundation. */
const CollectiblesHome = () => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NativeStackNavigationProp<CollectiblesStackParamList>>();

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={tw.style('flex-1 bg-default')}
      testID={CollectiblesHomeTestIds.CONTAINER}
    >
      <HeaderStandard
        includesTopInset
        title={strings('collectibles.title')}
        onBack={() => navigation.goBack()}
        backButtonProps={{ testID: CollectiblesHomeTestIds.BACK_BUTTON }}
      />
    </SafeAreaView>
  );
};

export default CollectiblesHome;
