import Button from '../../../component-library/components/Buttons/Button';
import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import Icon from '../../../component-library/components/Icons/Icon';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import SmartTransactionStatus from '../../Views/transactions/SmartTransactionStatus/SmartTransactionStatus';
import { View, Text as RNText, ScrollView } from 'react-native';
import Checkbox from '../../../component-library/components/Checkbox/Checkbox';
import { SnapUIImage } from '../../Snaps/SnapUIImage/SnapUIImage';
import { SnapAvatar } from '../../Snaps/SnapAvatar/SnapAvatar';
import AddressElement from '../../../components/Views/confirmations/legacy/SendFlow/AddressElement';
import { Box } from '../Box/Box';
import { SnapUICard } from '../../Snaps/SnapUICard/SnapUICard';
import { SnapUILink } from '../../Snaps/SnapUILink/SnapUILink';
import { SnapUIInput } from '../../Snaps/SnapUIInput/SnapUIInput';
import { SnapIcon } from '../../Snaps/SnapIcon/SnapIcon';
import { SnapUIFooterButton } from '../../Snaps/SnapUIFooterButton/SnapUIFooterButton';
import { ConfirmInfoRowValueDouble } from '../../../component-library/components-temp/Snaps/ConfirmInfoRowValueDouble/ConfirmInfoRowValueDouble';
import { SnapUIIcon } from '../../Snaps/SnapUIIcon/SnapUIIcon';
import { SnapUIButton } from '../../Snaps/SnapUIButton/SnapUIButton';
import { SnapUIBanner } from '../../Snaps/SnapUIBanner/SnapUIBanner';
import { SnapUICheckbox } from '../../Snaps/SnapUICheckbox/SnapUICheckbox';
import { SnapUIAddress } from '../../Snaps/SnapUIAddress/SnapUIAddress';
import { SnapUIAvatar } from '../../Snaps/SnapUIAvatar/SnapUIAvatar';
import { SnapUISelector } from '../../Snaps/SnapUISelector/SnapUISelector';
import InfoRow from '../../Views/confirmations/components/UI/InfoRow';
import { SnapUISpinner } from '../../Snaps/SnapUISpinner/SnapUISpinner';
import { SnapUITooltip } from '../../Snaps/SnapUITooltip/SnapUITooltip';
import { Skeleton } from '../../../component-library/components/Skeleton';

export const safeComponentList = {
  BottomSheetFooter,
  Button,
  Icon,
  SheetHeader,
  SmartTransactionStatus,
  Text,
  View,
  Checkbox,
  SnapUIImage,
  SnapUICard,
  SnapAvatar,
  SnapUILink,
  AddressElement,
  Box,
  SnapUIInput,
  SnapIcon,
  SnapUIIcon,
  SnapUIFooterButton,
  ConfirmInfoRowValueDouble,
  SnapUIButton,
  SnapUICheckbox,
  SnapUIAvatar,
  SnapUIAddress,
  SnapUIBanner,
  SnapUISelector,
  SnapUISpinner,
  InfoRow,
  RNText,
  ScrollView,
  SnapUITooltip,
  Skeleton,
};

export type SafeComponentListValues = typeof safeComponentList;
