import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeaderStandard } from '@metamask/design-system-react-native';
import { useNavigation } from '@react-navigation/native';
import type { AppNavigationProp } from '../../../core/NavigationService/types';
import { useParams } from '../../../util/navigation/navUtils';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NftDetails.styles';
import { NftDetailsParams } from './NftDetails.types';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';

const NftDetailsFullImage = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const { collectible } = useParams<NftDetailsParams>();

  const { styles } = useStyles(styleSheet, {});

  return (
    <SafeAreaView
      style={styles.fullImageScreen}
      edges={['left', 'right', 'bottom']}
    >
      <HeaderStandard includesTopInset onClose={() => navigation.goBack()} />
      <View style={[styles.fullImageContainer]}>
        <View style={[styles.fullImageItem]}>
          <CollectibleMedia cover renderAnimation collectible={collectible} />
        </View>
      </View>
    </SafeAreaView>
  );
};

export default NftDetailsFullImage;
