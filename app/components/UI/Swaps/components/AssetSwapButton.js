import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, View } from 'react-native';

import Text from '../../../Base/Text';
import AssetActionButton from '../../AssetOverview/AssetActionButton';
import InfoModal from './InfoModal';

import useModalHandler from '../../../Base/hooks/useModalHandler';
import { strings } from '../../../../../locales/i18n';

const styles = StyleSheet.create({
  disabledButton: {
    opacity: 0.5,
  },
});

function AssetSwapButton({
  isFeatureLive,
  isNetworkAllowed,
  isAssetAllowed,
  onPress,
}) {
  const [isModalOpen, , showModal, hideModal] = useModalHandler(false);
  const isDisabled = !isFeatureLive || !isNetworkAllowed || !isAssetAllowed;

  const [title, body] = useMemo(() => {
    if (!isNetworkAllowed)
      return [
        strings('swaps.wrong_network_title'),
        strings('swaps.wrong_network_body'),
      ];
    if (!isAssetAllowed)
      return [
        strings('swaps.unallowed_asset_title'),
        strings('swaps.unallowed_asset_body'),
      ];
    if (!isFeatureLive)
      return [
        strings('swaps.feature_off_title'),
        strings('swaps.feature_off_body'),
      ];
    return ['', ''];
  }, [isAssetAllowed, isFeatureLive, isNetworkAllowed]);
  return (
    <>
      <View style={isDisabled && styles.disabledButton}>
        <AssetActionButton
          icon="swap"
          label={strings('asset_overview.swap')}
          onPress={isDisabled ? showModal : onPress}
        />
      </View>
      <InfoModal
        isVisible={isDisabled && isModalOpen}
        toggleModal={hideModal}
        title={title}
        body={<Text>{body}</Text>}
      />
    </>
  );
}

AssetSwapButton.propTypes = {
  isFeatureLive: PropTypes.bool,
  isNetworkAllowed: PropTypes.bool,
  isAssetAllowed: PropTypes.bool,
  onPress: PropTypes.func,
};

export default AssetSwapButton;
