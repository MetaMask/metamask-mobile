import React, { FunctionComponent } from 'react';
import { CaipAccountId, CaipChainId } from '@metamask/utils';
import { SnapUISelector } from '../SnapUISelector/SnapUISelector';
import { strings } from '../../../../locales/i18n';
import { SnapUIAsset, useSnapAssetSelectorData } from './useSnapAssetDisplay';
import { Box } from '../../UI/Box/Box';
import { AlignItems, FlexDirection } from '../../UI/Box/box.types';
import BadgeWrapper, {
  BadgePosition,
} from '../../../component-library/components/Badges/BadgeWrapper';
import { AvatarSize } from '../../../component-library/components/Avatars/Avatar';
import AvatarToken from '../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Text, {
  TextColor,
  TextVariant,
} from '../../../component-library/components/Texts/Text';
import { ImageSourcePropType, ViewStyle } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../component-library/components/Badges/Badge';

/**
 *
 * @param props - The component props.
 * @param props.icon - The asset icon.
 * @param props.symbol - The asset symbol.
 * @param props.name - The asset name.
 * @param props.balance - The asset balance.
 * @param props.fiat - The asset balance in fiat.
 * @param props.networkName - The network name.
 * @param props.networkIcon - The network icon.
 * @param props.compact - Whether the selector is compact.
 * @param props.context - The rendering context ('inline' or 'modal').
 * @returns The Asset Selector option.
 */
const SnapUIAssetSelectorOption: FunctionComponent<
  SnapUIAsset & {
    style?: ViewStyle;
    compact?: boolean;
    context?: 'inline' | 'modal';
  }
> = ({
  icon,
  symbol,
  name,
  balance,
  fiat,
  networkName,
  networkIcon,
  compact = false,
  context = 'modal',
}) => (
  <Box
    alignItems={AlignItems.center}
    flexDirection={FlexDirection.Row}
    gap={16}
    // eslint-disable-next-line react-native/no-inline-styles
    style={{ overflow: 'hidden', flex: 1 }}
  >
    {/* eslint-disable-next-line react-native/no-inline-styles */}
    <Box alignItems={AlignItems.center}>
      <BadgeWrapper
        badgeElement={
          <Badge
            variant={BadgeVariant.Network}
            imageSource={networkIcon as ImageSourcePropType}
            name={networkName}
          />
        }
        badgePosition={BadgePosition.BottomRight}
      >
        <AvatarToken size={AvatarSize.Sm} imageSource={{ uri: icon }} />
      </BadgeWrapper>
    </Box>
    <Box
      flexDirection={FlexDirection.Column}
      // eslint-disable-next-line react-native/no-inline-styles
      style={{ overflow: 'hidden', flex: 1 }}
    >
      <Text
        variant={TextVariant.BodyMDMedium}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {name}
      </Text>
      <Text
        color={TextColor.Alternative}
        variant={TextVariant.BodySM}
        ellipsizeMode="tail"
        numberOfLines={1}
      >
        {networkName}
      </Text>
    </Box>
    <Box
      flexDirection={FlexDirection.Column}
      // We hide the balance and fiat in inline mode when the asset selector has a sibling element
      // eslint-disable-next-line react-native/no-inline-styles
      style={{
        marginLeft: 'auto',
        marginRight: 8,
        ...(context === 'inline' && compact ? { display: 'none' } : {}),
      }}
      alignItems={AlignItems.flexEnd}
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
  compact?: boolean;
}

/**
 * The SnapUIAssetSelector component.
 *
 * @param props - The component props.
 * @param props.addresses - The addresses to get the assets for.
 * @param props.chainIds - The chainIds to filter the assets by.
 * @param props.disabled - Whether the selector is disabled.
 * @param props.compact - Whether the selector is compact.
 * @returns The AssetSelector component.
 */
export const SnapUIAssetSelector: FunctionComponent<
  SnapUIAssetSelectorProps
> = ({ addresses, chainIds, disabled, style, compact, ...props }) => {
  const assets = useSnapAssetSelectorData({ addresses, chainIds });

  const options = assets.map(({ address, name, symbol }) => ({
    key: 'asset',
    value: { asset: address, name, symbol },
    disabled: false,
  }));

  const optionComponents = assets.map((asset, index) => (
    <SnapUIAssetSelectorOption {...asset} key={index} compact={compact} />
  ));

  return (
    <SnapUISelector
      title={strings('snap_ui.asset_selector.title')}
      options={options}
      optionComponents={optionComponents}
      disabled={disabled || assets.length === 0}
      style={style}
      compact={compact}
      {...props}
    />
  );
};
