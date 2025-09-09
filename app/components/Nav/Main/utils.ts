import { ImageSourcePropType } from 'react-native';
import { ToastVariants } from '../../../component-library/components/Toast';
import { strings } from '../../../../locales/i18n';

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
