import useTokenDescriptions, {
  TokenDescriptions,
} from '../../../hooks/useTokenDescriptions';
import { zeroAddress } from 'ethereumjs-util';
import React, { useContext, useMemo } from 'react';
import { View } from 'react-native';
import Title from '../../../Base/Title';
import { Asset } from '../AssetOverview.types';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import ContentDisplay from './ContentDisplay';
import { mockTheme, ThemeContext } from '../../../../util/theme';
import i18n, { strings } from '../../../../../locales/i18n';
import createStyles from './AboutAsset.styles';

interface AboutAssetProps {
  asset: Asset;
  chainId: string;
}

const AboutAsset = ({ asset, chainId }: AboutAssetProps) => {
  const { colors = mockTheme.colors } = useContext(ThemeContext);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const locale: keyof TokenDescriptions = i18n.locale;

  const { data: descriptions, isLoading: isDescriptionLoading } =
    useTokenDescriptions({
      address: asset.address || zeroAddress(),
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
            <SkeletonPlaceholder.Item
              width={'100%'}
              height={18}
              borderRadius={6}
              marginBottom={8}
            />
            <SkeletonPlaceholder.Item
              width={'100%'}
              height={18}
              borderRadius={6}
              marginBottom={8}
            />
            <SkeletonPlaceholder.Item
              width={'100%'}
              height={18}
              borderRadius={6}
              marginBottom={8}
            />
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
