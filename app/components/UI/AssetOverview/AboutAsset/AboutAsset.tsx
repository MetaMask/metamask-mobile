import { zeroAddress } from 'ethereumjs-util';
import React from 'react';
import { View } from 'react-native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import i18n, { strings } from '../../../../../locales/i18n';
import { useStyles } from '../../../../component-library/hooks';
import Title from '../../../Base/Title';
import useTokenDescriptions, {
  TokenDescriptions,
} from '../../../hooks/useTokenDescriptions';
import { Asset } from '../AssetOverview.types';
import styleSheet from './AboutAsset.styles';
import ContentDisplay from './ContentDisplay';

interface AboutAssetProps {
  asset: Asset;
  chainId: string;
}

const AboutAsset = ({ asset, chainId }: AboutAssetProps) => {
  const { styles } = useStyles(styleSheet, {});
  const locale: keyof TokenDescriptions = i18n.locale;
  const skeletonProps = {
    width: '100%',
    height: 18,
    borderRadius: 6,
    marginBottom: 8,
  };
  const { data: descriptions, isLoading: isDescriptionLoading } =
    useTokenDescriptions({
      address: asset.isETH ? zeroAddress() : asset.address,
      chainId: chainId as string,
    });

  const description = descriptions[locale] || descriptions.en;

  if (!isDescriptionLoading && !description) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      <Title style={styles.title}>{strings('asset_overview.about')}</Title>
      {isDescriptionLoading ? (
        <View>
          <SkeletonPlaceholder>
            <SkeletonPlaceholder.Item {...skeletonProps} />
            <SkeletonPlaceholder.Item {...skeletonProps} />
            <SkeletonPlaceholder.Item {...skeletonProps} />
          </SkeletonPlaceholder>
        </View>
      ) : (
        <ContentDisplay
          content={description}
          disclaimer={strings('asset_overview.disclaimer')}
        />
      )}
    </View>
  );
};

export default AboutAsset;
