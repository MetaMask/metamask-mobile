import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import Icon from '../../../component-library/components/Icons/Icon';
import SmartTransactionStatus from '../../Views/transactions/SmartTransactionStatus/SmartTransactionStatus';
import { View, ScrollView, TouchableHighlight } from 'react-native';
import { SnapUIImage } from '../../Snaps/SnapUIImage/SnapUIImage';
import { Box } from '../Box/Box';
import { SnapUICard } from '../../Snaps/SnapUICard/SnapUICard';
import { SnapUILink } from '../../Snaps/SnapUILink/SnapUILink';
import { SnapUIInput } from '../../Snaps/SnapUIInput/SnapUIInput';
import { SnapUIFooterButton } from '../../Snaps/SnapUIFooterButton/SnapUIFooterButton';
import { ConfirmInfoRowValueDouble } from '../../../component-library/components-temp/Snaps/ConfirmInfoRowValueDouble/ConfirmInfoRowValueDouble';
import { SnapUIIcon } from '../../Snaps/SnapUIIcon/SnapUIIcon';
import { SnapUIButton } from '../../Snaps/SnapUIButton/SnapUIButton';
import { SnapUIBanner } from '../../Snaps/SnapUIBanner/SnapUIBanner';
import { SnapUICheckbox } from '../../Snaps/SnapUICheckbox/SnapUICheckbox';
import { SnapUIDropdown } from '../../Snaps/SnapUIDropdown/SnapUIDropdown';
import { SnapUIAddress } from '../../Snaps/SnapUIAddress/SnapUIAddress';
import { SnapUIAvatar } from '../../Snaps/SnapUIAvatar/SnapUIAvatar';
import { SnapUISelector } from '../../Snaps/SnapUISelector/SnapUISelector';
import { SnapUISpinner } from '../../Snaps/SnapUISpinner/SnapUISpinner';
import { SnapUITooltip } from '../../Snaps/SnapUITooltip/SnapUITooltip';
import { Skeleton } from '../../../component-library/components/Skeleton';
import { SnapUIAddressInput } from '../../Snaps/SnapUIAddressInput/SnapUIAddressInput';
import { SnapUIInfoRow } from '../../Snaps/SnapUIInfoRow/SnapUIInfoRow';
import { SnapUIAssetSelector } from '../../Snaps/SnapUIAssetSelector/SnapUIAssetSelector';
import { SnapUICopyable } from '../../Snaps/SnapUICopyable/SnapUICopyable';
import { SnapUIAccountSelector } from '../../Snaps/SnapUIAccountSelector/SnapUIAccountSelector';
import { SnapUIRadioGroup } from '../../Snaps/SnapUIRadioGroup/SnapUIRadioGroup';
import { SnapUIDateTimePicker } from '../../Snaps/SnapUIDateTimePicker/SnapUIDateTimePicker';
import { SnapUICollapsibleSection } from '../../Snaps/SnapUICollapsibleSection/SnapUICollapsibleSection';

export const safeComponentList = {
  Icon,
  SheetHeader,
  SmartTransactionStatus,
  Text,
  View,
  SnapUIImage,
  SnapUICard,
  SnapUILink,
  Box,
  SnapUIInput,
  SnapUIAddressInput,
  SnapUIIcon,
  SnapUIFooterButton,
  ConfirmInfoRowValueDouble,
  SnapUIButton,
  SnapUICheckbox,
  SnapUIDropdown,
  SnapUIRadioGroup,
  SnapUIAvatar,
  SnapUIAddress,
  SnapUIBanner,
  SnapUIAssetSelector,
  SnapUISelector,
  SnapUISpinner,
  SnapUIInfoRow,
  SnapUIAccountSelector,
  SnapUIDateTimePicker,
  ScrollView,
  SnapUITooltip,
  Skeleton,
  SnapUICopyable,
  TouchableHighlight,
  SnapUICollapsibleSection,
};

export type SafeComponentListValues = typeof safeComponentList;
