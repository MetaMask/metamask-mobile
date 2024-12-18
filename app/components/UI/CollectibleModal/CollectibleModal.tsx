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
import ReusableModal, { ReusableModalRef } from '../ReusableModal';
import Routes from '../../../constants/navigation/Routes';
import CollectibleOverview from '../../UI/CollectibleOverview';
import { collectiblesSelector } from '../../../reducers/collectibles';
import {
  selectDisplayNftMedia,
  selectIsIpfsGatewayEnabled,
} from '../../../selectors/preferencesController';
import styles from './CollectibleModal.styles';
import { CollectibleModalParams } from './CollectibleModal.types';
import { useNavigation } from '@react-navigation/native';
import { useParams } from '../../../util/navigation/navUtils';
import { useMetrics } from '../../hooks/useMetrics';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { selectChainId } from '../../../selectors/networkController';
import { getDecimalChainId } from '../../../util/networks';
import { Nft } from '@metamask/assets-controllers';
import { EXTERNAL_LINK_TYPE } from '../../../constants/browser';

const CollectibleModal = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { trackEvent, createEventBuilder } = useMetrics();
  const chainId = useSelector(selectChainId);

  const { contractName, collectible } = useParams<CollectibleModalParams>();

  const modalRef = useRef<ReusableModalRef>(null);

  const [mediaZIndex, setMediaZIndex] = useState(20);
  const [overviewZIndex, setOverviewZIndex] = useState(10);

  const [updatedCollectible, setUpdatedCollectible] = useState(collectible);

  const collectibles: Nft[] = useSelector(collectiblesSelector);
  const isIpfsGatewatEnabled = useSelector(selectIsIpfsGatewayEnabled);
  const displayNftMedia = useSelector(selectDisplayNftMedia);

  const handleUpdateCollectible = useCallback(() => {
    if (isIpfsGatewatEnabled || displayNftMedia) {
      const newUpdatedCollectible = collectibles.find(
        (nft: Nft) =>
          nft.address === collectible.address &&
          nft.tokenId === collectible.tokenId,
      );

      if (newUpdatedCollectible) {
        setUpdatedCollectible(newUpdatedCollectible);
      }
    }
  }, [isIpfsGatewatEnabled, collectibles, collectible, displayNftMedia]);

  useEffect(() => {
    handleUpdateCollectible();
  }, [handleUpdateCollectible]);

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.COLLECTIBLE_DETAILS_OPENED)
        .addProperties({ chain_id: getDecimalChainId(chainId) })
        .build(),
    );
    // The linter wants `trackEvent` to be added as a dependency,
    // But the event fires twice if I do that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chainId]);

  const onSend = useCallback(async () => {
    dispatch(newAssetTransaction({ contractName, ...collectible }));
    //@ts-expect-error replace do not exist on ParamListBase
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
          linkType: EXTERNAL_LINK_TYPE,
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
