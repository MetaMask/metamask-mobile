import React from 'react';
import { View } from 'react-native';
import Text from '../../../../component-library/components/Texts/Text';
import { useSelector } from 'react-redux';
import { selectTokenDetailsV2Enabled } from '../../../../selectors/featureFlagController/tokenDetailsV2';
import Asset from '../../../Views/Asset';

const TokenDetailsFeatureFlagWrapper: React.FC = (props: any) => {
  const isTokenDetailsV2Enabled = useSelector(selectTokenDetailsV2Enabled);

  return isTokenDetailsV2Enabled ? (
    <TokenDetails {...props} />
  ) : (
    <Asset {...props} />
  );
};

const TokenDetails: React.FC = () => {
  console.log('TokenDetails');
  return (
    <View>
      <Text>Token Details</Text>
    </View>
  );
};

export { TokenDetailsFeatureFlagWrapper as TokenDetails };
