/* eslint-disable react/prop-types */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { newAssetTransaction } from '../../../actions/transaction';
import CollectibleMedia from '../CollectibleMedia';
import { baseStyles } from '../../../styles/common';
import ReusableModal from '../ReusableModal';
import Routes from '../../../constants/navigation/Routes';
import CollectibleOverview from '../../UI/CollectibleOverview';
import { collectiblesSelector } from '../../../reducers/collectibles';
import {
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
} from '../../../selectors/preferencesController';
import { Collectible } from '../CollectibleMedia/CollectibleMedia.types';
import styles from './CollectibleModal.styles';
import { CollectibleModalParams } from './CollectibleModal.types';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';

const CollectibleModal = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();

  const { contractName, collectible } = useParams<CollectibleModalParams>();

  const modalRef = useRef(null);

  const [mediaZIndex, setMediaZIndex] = useState(20);
  const [overviewZIndex, setOverviewZIndex] = useState(10);

  const [updatedCollectible, setUpdatedCollectible] = useState(collectible);

  const collectibles: Collectible[] = useSelector(collectiblesSelector);
  const isIpfsGatewatEnabled = useSelector(selectIsIpfsGatewayEnabled);
  const displayNftMedia = useSelector(selectDisplayNftMedia);

  const handleUpdateCollectible = useCallback(() => {
    if (isIpfsGatewatEnabled || displayNftMedia) {
      const newUpdatedCollectible = collectibles.find(
        (nft: Collectible) => nft.address === collectible.address,
      );

      if (newUpdatedCollectible) {
        setUpdatedCollectible(newUpdatedCollectible);
      }
    }
  }, [isIpfsGatewatEnabled, collectibles, collectible, displayNftMedia]);

  useEffect(() => {
    handleUpdateCollectible();
  }, [handleUpdateCollectible]);

  const onSend = useCallback(async () => {
    dispatch(newAssetTransaction({ contractName, ...collectible }));
    navigation.replace('SendFlowView');
  }, [contractName, collectible, navigation, dispatch]);

  const isTradable = useCallback(
    () => collectible.standard === 'ERC721',
    [collectible],
  );

  const openLink = useCallback(
    (url: string) => {
      navigation.navigate(Routes.BROWSER_TAB_HOME, {
        screen: Routes.BROWSER_VIEW,
        params: {
          newTabUrl: url,
          timestamp: Date.now(),
        },
      });
    },
    [navigation],
  );

  const onCollectibleOverviewTranslation = (moveUp: boolean) => {
    if (moveUp) {
      setTimeout(() => {
        setMediaZIndex(20);
        setOverviewZIndex(10);
      }, 250);
    } else {
      setMediaZIndex(0);
      setOverviewZIndex(10);
    }
  };
  const collectibleData = useMemo(
    () => ({ ...collectible, ...updatedCollectible, contractName }),
    [collectible, contractName, updatedCollectible],
  );

  return (
    <ReusableModal ref={modalRef} style={styles.bottomModal}>
      <>
        <View
          style={[
            styles.collectibleMediaWrapper,
            { zIndex: mediaZIndex, elevation: mediaZIndex },
          ]}
        >
          <CollectibleMedia
            onClose={() => modalRef.current?.dismissModal()}
            cover
            renderAnimation
            collectible={collectibleData}
            style={styles.round}
          />
        </View>
        <View
          style={[
            baseStyles.flexStatic,
            { zIndex: overviewZIndex, elevation: overviewZIndex },
          ]}
        >
          <CollectibleOverview
            navigation={navigation}
            collectible={collectibleData}
            tradable={isTradable()}
            onSend={onSend}
            openLink={openLink}
            onTranslation={onCollectibleOverviewTranslation}
          />
        </View>
      </>
    </ReusableModal>
  );
};

export default CollectibleModal;
