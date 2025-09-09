import React, { useCallback, useEffect } from 'react';
import { SafeAreaView, View } from 'react-native';
import { getNftFullImageNavbarOptions } from '../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NftDetails.styles';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';
import type { StackScreenProps } from '@react-navigation/stack';
import type { RootParamList } from '../../../util/navigation';

type NftDetailsFullImageProps = StackScreenProps<
  RootParamList,
  'NftDetailsFullImage'
>;

const NftDetailsFullImage = ({ route }: NftDetailsFullImageProps) => {
  const navigation = useNavigation();
  const { collectible } = route.params;

  const {
    styles,
    theme: { colors },
  } = useStyles(styleSheet, {});

  const updateNavBar = useCallback(() => {
    navigation.setOptions(getNftFullImageNavbarOptions(navigation, colors));
  }, [colors, navigation]);

  useEffect(() => {
    updateNavBar();
  }, [updateNavBar]);

  return (
    <SafeAreaView style={[styles.fullImageContainer]}>
      <View style={[styles.fullImageItem]}>
        <CollectibleMedia cover renderAnimation collectible={collectible} />
      </View>
    </SafeAreaView>
  );
};

export default NftDetailsFullImage;
