import React, { FunctionComponent } from 'react';
import { CaipAccountId, CaipChainId } from '@metamask/utils';
import { SnapUISelector } from '../SnapUISelector/SnapUISelector';
import { strings } from '../../../../locales/i18n';
import { SnapUIAsset, useSnapAssetSelectorData } from './useSnapAssetDisplay';
import { Box } from '../../UI/Box/Box';
import { AlignItems, BackgroundColor, FlexDirection, TextAlign } from '../../UI/Box/box.types';
import BadgeWrapper from '../../../component-library/components/Badges/BadgeWrapper';
import AvatarNetwork from '../../../component-library/components/Avatars/Avatar/variants/AvatarNetwork';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Text, { TextColor, TextVariant } from '../../../component-library/components/Texts/Text';
import { ImageSourcePropType, ViewStyle } from 'react-native';
/**
 * An option for the SnapUIAssetSelector.
 *
 * @param props - The component props.
 * @param props.icon - The asset icon.
 * @param props.symbol - The asset symbol.
 * @param props.name - The asset name.
 * @param props.balance - The asset balance.
 * @param props.fiat - The asset balance in fiat.
 * @param props.networkName - The network name.
 * @param props.networkIcon - The network icon.
 * @returns The Asset Selector option.
 */
const SnapUIAssetSelectorOption: FunctionComponent<SnapUIAsset & { style?: ViewStyle }> = ({
  icon,
  symbol,
  name,
  balance,
  fiat,
  networkName,
  networkIcon,
  style,
}) => (
  <Box
    alignItems={AlignItems.center}
    gap={4}
    // eslint-disable-next-line react-native/no-inline-styles
    style={{ overflow: 'hidden' }}
  >
    <Box alignItems={AlignItems.center}>
      <BadgeWrapper
        badgeElement={
          <AvatarNetwork
            size={AvatarSize.Xs}
            name={networkName}
            imageSource={networkIcon as ImageSourcePropType}
            style={{ backgroundColor: BackgroundColor.backgroundDefault }}
          />
        }
      >
        <AvatarToken imageSource={icon as ImageSourcePropType} />
      </BadgeWrapper>
    </Box>
    <Box
      flexDirection={FlexDirection.Column}
      // eslint-disable-next-line react-native/no-inline-styles
      style={{ overflow: 'hidden' }}
    >
      <Text variant={TextVariant.BodyMDMedium} ellipsizeMode="tail">
        {name}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodySM}
        ellipsizeMode="tail"
      >
        {networkName}
      </Text>
    </Box>
    <Box
      flexDirection={FlexDirection.Column}
      // eslint-disable-next-line react-native/no-inline-styles
      style={{ marginLeft: 'auto', ...style }}
      textAlign={TextAlign.right}
    >
      <Text variant={TextVariant.BodySMMedium}>
        {balance} {symbol}
      </Text>
      <Text color={TextColor.Alternative} variant={TextVariant.BodySM}>
        {fiat}
      </Text>
    </Box>
  </Box>
);

/**
 * The props for the SnapUIAssetSelector.
 */
interface SnapUIAssetSelectorProps {
  name: string;
  addresses: CaipAccountId[];
  chainIds?: CaipChainId[];
  disabled?: boolean;
  form?: string;
  label?: string;
  error?: string;
  style?: Record<string, ViewStyle>;
}


/**
 * The SnapUIAssetSelector component.
 *
 * @param props - The component props.
 * @param props.addresses - The addresses to get the assets for.
 * @param props.chainIds - The chainIds to filter the assets by.
 * @param props.disabled - Whether the selector is disabled.
 * @returns The AssetSelector component.
 */
export const SnapUIAssetSelector: FunctionComponent<
  SnapUIAssetSelectorProps
> = ({ addresses, chainIds, disabled, style, ...props }) => {
  const t = (name: string, params?: object) =>
    strings(name, params) ?? '';
  const assets = useSnapAssetSelectorData({ addresses, chainIds });

  const options = assets.map(({ address, name, symbol }) => ({
    key: 'asset',
    value: { asset: address, name, symbol },
    disabled: false,
  }));

  const optionComponents = assets.map((asset, index) => (
    <SnapUIAssetSelectorOption {...asset} key={index} style={style?.option} />
  ));

  return (
    <SnapUISelector
      title={t('snaps.snap_ui.asset_selector.title')}
      options={options}
      optionComponents={optionComponents}
      disabled={disabled || assets.length === 0}
      style={style?.base}
      {...props}
    />
  );
};
