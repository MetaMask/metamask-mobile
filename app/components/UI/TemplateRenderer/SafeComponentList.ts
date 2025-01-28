import Button from '../../../component-library/components/Buttons/Button';

import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import Icon from '../../../component-library/components/Icons/Icon';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import SmartTransactionStatus from '../../Views/SmartTransactionStatus/SmartTransactionStatus';
import { View } from 'react-native';
import Checkbox from '../../../component-library/components/Checkbox/Checkbox';
import { SnapUIImage } from '../../UI/Snaps/SnapUIImage';
import { SnapAvatar } from '../Snaps/SnapAvatar/SnapAvatar';
import AddressElement from '../../../components/Views/confirmations/SendFlow/AddressElement';
import { Box } from '../../UI/Box';
import { SnapUICard } from '../../Approvals/Snaps/SnapUICard';
import { SnapUILink } from '../Snaps/SnapUILink';
import { SnapUIInput } from '../Snaps/SnapUIInput/Index';
import { SnapIcon } from '../../Approvals/Snaps/SnapIcon/SnapIcon';
import { SnapUIFooterButton } from '../../Approvals/Snaps/SnapUIFooterButton/SnapUIFooterButton';
import { ConfirmInfoRowValueDouble } from '../../../component-library/components/ConfirmInfoRowValueDouble/ConfirmInfoRowValueDouble';
import { SnapUIIcon } from '../../Approvals/Snaps/SnapUIIcon/SnapUIIcon';

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
};

export type SafeComponentListValues = typeof safeComponentList;
