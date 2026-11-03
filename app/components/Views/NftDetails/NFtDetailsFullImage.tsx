import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useParams } from '../../../util/navigation/navUtils';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NftDetails.styles';
import { NftDetailsParams } from './NftDetails.types';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';
import { useSelector } from 'react-redux';
import HeaderStandardGlass from '../../../component-library/components-temp/HeaderStandardGlass';
import { selectGlassHeadersEnabled } from '../../../selectors/featureFlagController/glassHeaders';

const NftDetailsFullImage = () => {
  const isGlassHeader = useSelector(selectGlassHeadersEnabled) === true;
  const navigation = useNavigation<AppNavigationProp>();
  const { collectible } = useParams<NftDetailsParams>();

  const { styles } = useStyles(styleSheet, {});

  return (
    <SafeAreaView
      style={styles.fullImageScreen}
      edges={['left', 'right', 'bottom']}
    >
      <HeaderStandardGlass
        isGlass={isGlassHeader}
        isFloating={false}
        includesTopInset
        onClose={() => navigation.goBack()}
      />
      <View style={[styles.fullImageContainer]}>
        <View style={[styles.fullImageItem]}>
          <CollectibleMedia cover renderAnimation collectible={collectible} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default NftDetailsFullImage;
