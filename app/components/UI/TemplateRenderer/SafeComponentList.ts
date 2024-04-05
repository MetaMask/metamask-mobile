import Button from '../../../component-library/components/Buttons/Button';

import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import Icon from '../../../component-library/components/Icons/Icon';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { View } from 'react-native';

export const safeComponentList = {
  BottomSheetFooter,
  Button,
  Icon,
  SheetHeader,
  Text,
  View,
};

export type SafeComponentListValues = typeof safeComponentList;
