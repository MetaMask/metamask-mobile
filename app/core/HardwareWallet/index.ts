export {
  createHardwareWalletError,
  parseErrorByType,
  isUserCancellation,
  isHardwareWalletError,
  type MobileErrorExtension,
  RecoveryAction,
  getIconForErrorCode,
  getIconColorForErrorCode,
  getTitleForErrorCode,
} from './errors';

export {
  HardwareWalletErrorProvider,
  useHardwareWalletError,
  type HardwareWalletErrorContextType,
  type HardwareWalletErrorProviderProps,
} from './HardwareWalletErrorContext';

export {
  HardwareWalletErrorBottomSheet,
  type HardwareWalletErrorBottomSheetProps,
} from './components';

export {
  HardwareWalletType,
  getHardwareWalletTypeForAddress,
  getHardwareWalletTypeName,
} from './helpers';
