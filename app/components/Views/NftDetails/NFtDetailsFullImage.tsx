import React, { useCallback, useEffect } from 'react';
import { SafeAreaView, View } from 'react-native';
import { getNftFullImageNavbarOptions } from '../../UI/Navbar';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';
import { useStyles } from '../../../component-library/hooks';
import styleSheet from './NftDetails.styles';
import { NftDetailsParams } from './NftDetails.types';
import CollectibleMedia from '../../../components/UI/CollectibleMedia';

const NftDetailsFullImage = () => {
  const navigation = useNavigation();
  const { collectible } = useParams<NftDetailsParams>();

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
