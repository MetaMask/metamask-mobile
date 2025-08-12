import { AssetSelectorElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const assetSelector: UIComponentFactory<AssetSelectorElement> = ({
  element: e,
  form,
}) => ({
    element: 'SnapUIAssetSelector',
    props: {
      name: e.props.name,
      addresses: e.props.addresses,
      chainIds: e.props.chainIds,
      disabled: e.props.disabled,
      form,
    },
  });
