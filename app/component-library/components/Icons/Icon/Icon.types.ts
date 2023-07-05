// Third party dependencies.
import React from 'react';
import { ViewProps } from 'react-native';
import { SvgProps } from 'react-native-svg';

/**
 * Icon color
 */
export enum IconColor {
  Default = 'Default',
  Alternative = 'Alternative',
  Muted = 'Muted',
  Primary = 'Primary',
  Success = 'Success',
  // eslint-disable-next-line @typescript-eslint/no-shadow
  Error = 'Error',
  Warning = 'Warning',
  Info = 'Info',
}

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
  // TODO finalize Icon size in Design system
  XXL = '72',
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
  name: IconName;
  /**
   * Color of the icon.
   */
  color?: string | IconColor;
}

/**
 * Asset stored by icon name
 */
export type AssetByIconName = {
  [key in IconName]: React.FC<SvgProps & { name: string }>;
};

///////////////////////////////////////////////////////
// This is generated code - Manually add types above
// DO NOT EDIT - Use generate-assets.js
///////////////////////////////////////////////////////

/**
 * Icon names
 */
export enum IconName {
  Activity = 'Activity',
  AddSquare = 'AddSquare',
  Add = 'Add',
  Arrow2Down = 'Arrow2Down',
  Arrow2Left = 'Arrow2Left',
  Arrow2Right = 'Arrow2Right',
  Arrow2Up = 'Arrow2Up',
  Arrow2Upright = 'Arrow2Upright',
  ArrowDoubleLeft = 'ArrowDoubleLeft',
  ArrowDoubleRight = 'ArrowDoubleRight',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  ArrowUp = 'ArrowUp',
  Ban = 'Ban',
  BankToken = 'BankToken',
  Bank = 'Bank',
  Bold = 'Bold',
  Book = 'Book',
  Bookmark = 'Bookmark',
  Bridge = 'Bridge',
  Calculator = 'Calculator',
  CardPos = 'CardPos',
  CardToken = 'CardToken',
  Card = 'Card',
  Category = 'Category',
  Chart2 = 'Chart2',
  Chart = 'Chart',
  CheckBold = 'CheckBold',
  CheckBoxOff = 'CheckBoxOff',
  CheckBoxOn = 'CheckBoxOn',
  CheckCircleOff = 'CheckCircleOff',
  Check = 'Check',
  CircleX = 'CircleX',
  Clock = 'Clock',
  Close = 'Close',
  CodeCircle = 'CodeCircle',
  Coin = 'Coin',
  Confirmation = 'Confirmation',
  Connect = 'Connect',
  CopySuccess = 'CopySuccess',
  Copy = 'Copy',
  Customize = 'Customize',
  Danger = 'Danger',
  Dark = 'Dark',
  Data = 'Data',
  Diagram = 'Diagram',
  DocumentCode = 'DocumentCode',
  Download = 'Download',
  Edit = 'Edit',
  Eraser = 'Eraser',
  Ethereum = 'Ethereum',
  Expand = 'Expand',
  Explore = 'Explore',
  Export = 'Export',
  EyeSlash = 'EyeSlash',
  Eye = 'Eye',
  File = 'File',
  Filter = 'Filter',
  Flag = 'Flag',
  FlashSlash = 'FlashSlash',
  Flash = 'Flash',
  Flask = 'Flask',
  Fox = 'Fox',
  FullCircle = 'FullCircle',
  Gas = 'Gas',
  GlobalSearch = 'GlobalSearch',
  Global = 'Global',
  Graph = 'Graph',
  Hardware = 'Hardware',
  Heart = 'Heart',
  Hierarchy = 'Hierarchy',
  Home = 'Home',
  Import = 'Import',
  Info = 'Info',
  Key = 'Key',
  Light = 'Light',
  Link2 = 'Link2',
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
  MinusBold = 'MinusBold',
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
  Plug = 'Plug',
  ProgrammingArrows = 'ProgrammingArrows',
  QrCode = 'QrCode',
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
  Share = 'Share',
  Slash = 'Slash',
  SnapsMobile = 'SnapsMobile',
  SnapsPlus = 'SnapsPlus',
  Snaps = 'Snaps',
  Speedometer = 'Speedometer',
  Square = 'Square',
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
  Twitter = 'Twitter',
  Upload = 'Upload',
  Usb = 'Usb',
  UserAdd = 'UserAdd',
  UserCheck = 'UserCheck',
  UserCircleAdd = 'UserCircleAdd',
  UserCircle = 'UserCircle',
  UserMinus = 'UserMinus',
  UserRemove = 'UserRemove',
  UserSearch = 'UserSearch',
  UserTick = 'UserTick',
  User = 'User',
  WalletCard = 'WalletCard',
  WalletMoney = 'WalletMoney',
  Wallet = 'Wallet',
  Warning = 'Warning',
  Wifi = 'Wifi',
}
