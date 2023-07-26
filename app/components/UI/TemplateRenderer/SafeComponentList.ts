import Button from '../../../component-library/components/Buttons/Button';

import SheetHeader from '../../../component-library/components/Sheet/SheetHeader';
import Text from '../../../component-library/components/Texts/Text';
import Icon from '../../../component-library/components/Icons/Icon';
import BottomSheetFooter from '../../../component-library/components/BottomSheets/BottomSheetFooter';
import { View } from 'react-native';
import { SafeComponentList } from './types';

// eslint-disable-next-line import/prefer-default-export
export const safeComponentList: SafeComponentList = {
  BottomSheetFooter,
  Button,
  Icon,
  SheetHeader,
  Text,
  View,
};
