// Third party dependencies.
import React from 'react';
import { ViewProps } from 'react-native';
import { SvgProps } from 'react-native-svg';

/**
 * Icon sizes
 */
export enum IconSize {
  Xss = '10',
  Xs = '12',
  Sm = '16',
  Md = '20',
  Lg = '24',
  Xl = '32',
}

/**
 * Icon component props.
 */
export interface IconProps extends ViewProps {
  /**
   * Optional enum to select between icon sizes.
   * @default Md
   */
  size?: IconSize;
  /**
   * Enum to select between icon names.
   */
  name: IconNames;
  /**
   * Color of the icon.
   */
  color?: string;
}

/**
 * Style sheet input parameters.
 */
export interface IconStyleSheetVars extends Pick<IconProps, 'style'> {
  size: IconSize;
}

/**
 * Asset stored by icon name
 */
export type AssetByIconName = {
  [key in IconNames]: React.FC<SvgProps>;
};

///////////////////////////////////////////////////////
// This is generated code - Manually add types above
// DO NOT EDIT - Use generate-assets.js
///////////////////////////////////////////////////////

/**
 * Icon names
 */
export enum IconNames {
  AddSquare = 'AddSquare',
  Add = 'Add',
  Arrow2Down = 'Arrow2Down',
  Arrow2Left = 'Arrow2Left',
  Arrow2Right = 'Arrow2Right',
  Arrow2Up = 'Arrow2Up',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  ArrowUp = 'ArrowUp',
  BankToken = 'BankToken',
  Bank = 'Bank',
  Book = 'Book',
  Bookmark = 'Bookmark',
  Calculator = 'Calculator',
  CardPos = 'CardPos',
  CardToken = 'CardToken',
  Card = 'Card',
  Category = 'Category',
  Chart = 'Chart',
  Check = 'Check',
  Clock = 'Clock',
  Close = 'Close',
  CodeCircle = 'CodeCircle',
  Coin = 'Coin',
  Confirmation = 'Confirmation',
  Connect = 'Connect',
  CopySuccess = 'CopySuccess',
  Copy = 'Copy',
  Danger = 'Danger',
  Dark = 'Dark',
  Data = 'Data',
  Diagram = 'Diagram',
  DocumentCode = 'DocumentCode',
  Edit = 'Edit',
  Eraser = 'Eraser',
  Expand = 'Expand',
  Explore = 'Explore',
  Export = 'Export',
  EyeSlash = 'EyeSlash',
  Eye = 'Eye',
  Filter = 'Filter',
  Flag = 'Flag',
  FlashSlash = 'FlashSlash',
  Flash = 'Flash',
  FullCircle = 'FullCircle',
  Gas = 'Gas',
  GlobalSearch = 'GlobalSearch',
  Global = 'Global',
  Graph = 'Graph',
  Heart = 'Heart',
  Hierarchy = 'Hierarchy',
  Home = 'Home',
  Import = 'Import',
  Info = 'Info',
  Key = 'Key',
  Light = 'Light',
  Link = 'Link',
  Loading = 'Loading',
  LockCircle = 'LockCircle',
  LockSlash = 'LockSlash',
  Lock = 'Lock',
  Login = 'Login',
  Logout = 'Logout',
  Menu = 'Menu',
  MessageQuestion = 'MessageQuestion',
  Messages = 'Messages',
  MinusSquare = 'MinusSquare',
  Minus = 'Minus',
  Mobile = 'Mobile',
  Money = 'Money',
  Monitor = 'Monitor',
  MoreHorizontal = 'MoreHorizontal',
  MoreVertical = 'MoreVertical',
  NotificationCircle = 'NotificationCircle',
  Notification = 'Notification',
  PasswordCheck = 'PasswordCheck',
  People = 'People',
  ProgrammingArrows = 'ProgrammingArrows',
  Question = 'Question',
  Received = 'Received',
  Refresh = 'Refresh',
  Save = 'Save',
  ScanBarcode = 'ScanBarcode',
  ScanFocus = 'ScanFocus',
  Scan = 'Scan',
  Scroll = 'Scroll',
  Search = 'Search',
  SecurityCard = 'SecurityCard',
  SecurityCross = 'SecurityCross',
  SecurityKey = 'SecurityKey',
  SecuritySearch = 'SecuritySearch',
  SecuritySlash = 'SecuritySlash',
  SecurityTick = 'SecurityTick',
  SecurityTime = 'SecurityTime',
  SecurityUser = 'SecurityUser',
  Security = 'Security',
  Send1 = 'Send1',
  Send2 = 'Send2',
  Setting = 'Setting',
  Slash = 'Slash',
  SnapsMobile = 'SnapsMobile',
  SnapsPlus = 'SnapsPlus',
  Snaps = 'Snaps',
  Speedometer = 'Speedometer',
  Star = 'Star',
  Student = 'Student',
  SwapHorizontal = 'SwapHorizontal',
  SwapVertival = 'SwapVertival',
  Tag = 'Tag',
  Tilde = 'Tilde',
  Timer = 'Timer',
  Trash = 'Trash',
  TrendDown = 'TrendDown',
  TrendUp = 'TrendUp',
  UserCircleAdd = 'UserCircleAdd',
  UserCircle = 'UserCircle',
  User = 'User',
  WalletCard = 'WalletCard',
  WalletMoney = 'WalletMoney',
  Wallet = 'Wallet',
  Warning = 'Warning',
}
