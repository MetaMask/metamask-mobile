import { ImageSourcePropType } from 'react-native';
import { ToastVariants } from '../../../component-library/components/Toast';
import { strings } from '../../../../locales/i18n';
import { consumeSuppressedNetworkAddedToast } from '../../../util/networks/networkToastSuppression';

export const handleShowNetworkActiveToast = (
  isOnBridgeRoute: boolean,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toastRef: React.RefObject<any> | undefined,
  networkName: string,
  networkImage: ImageSourcePropType,
) => {
  if (!isOnBridgeRoute) {
    toastRef?.current?.showToast({
      variant: ToastVariants.Network,
      labelOptions: [
        {
          label: `${networkName} `,
          isBold: true,
        },
        { label: strings('toast.now_active') },
      ],
      networkImageSource: networkImage,
    });
  }
};

export const shouldShowNetworkListToast = ({
  newNetworkChainId,
  hasDeletedNetwork,
}: {
  newNetworkChainId?: string;
  hasDeletedNetwork: boolean;
}) => {
  const shouldShowNetworkAddedToast =
    Boolean(newNetworkChainId) &&
    !consumeSuppressedNetworkAddedToast(newNetworkChainId);

  return shouldShowNetworkAddedToast || hasDeletedNetwork;
};
