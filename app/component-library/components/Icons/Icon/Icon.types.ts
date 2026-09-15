/* eslint-disable @typescript-eslint/no-shadow */
// Third party dependencies.
import React from 'react';
import { ViewProps, Insets } from 'react-native';
import { SvgProps } from 'react-native-svg';

/**
 * Icon color
 */
export enum IconColor {
  Default = 'Default',
  Inverse = 'Inverse',
  Alternative = 'Alternative',
  Muted = 'Muted',
  Primary = 'Primary',
  PrimaryAlternative = 'Primary',
  Success = 'Success',
  Error = 'Error',
  ErrorAlternative = 'ErrorAlternative',
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
  /**
   * Optional hitSlop prop.
   */
  hitSlop?: number | Insets;
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
  AfterHours = 'AfterHours',
  Apple = 'Apple',
  Arrow2Down = 'Arrow2Down',
  Arrow2Right = 'Arrow2Right',
  Arrow2UpRight = 'Arrow2UpRight',
  Arrow2Up = 'Arrow2Up',
  ArrowDoubleRight = 'ArrowDoubleRight',
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  ArrowUp = 'ArrowUp',
  AttachMoney = 'AttachMoney',
  Bank = 'Bank',
  Bookmark = 'Bookmark',
  BuySell = 'BuySell',
  Calendar = 'Calendar',
  Camera = 'Camera',
  Card = 'Card',
  Chart = 'Chart',
  CheckBold = 'CheckBold',
  Check = 'Check',
  CircleX = 'CircleX',
  ClockFilled = 'ClockFilled',
  Clock = 'Clock',
  Close = 'Close',
  Confirmation = 'Confirmation',
  Connect = 'Connect',
  CopySuccess = 'CopySuccess',
  Copy = 'Copy',
  Danger = 'Danger',
  Data = 'Data',
  Details = 'Details',
  DragGrid = 'DragGrid',
  Edit = 'Edit',
  Error = 'Error',
  Explore = 'Explore',
  Export = 'Export',
  EyeSlash = 'EyeSlash',
  Eye = 'Eye',
  FaceId = 'FaceId',
  Filter = 'Filter',
  Forest = 'Forest',
  FullCircle = 'FullCircle',
  Gas = 'Gas',
  Global = 'Global',
  Hardware = 'Hardware',
  Hierarchy = 'Hierarchy',
  HomeFilled = 'HomeFilled',
  Home = 'Home',
  Info = 'Info',
  Key = 'Key',
  Loading = 'Loading',
  Location = 'Location',
  LockSlash = 'LockSlash',
  Lock = 'Lock',
  Logout = 'Logout',
  MessageQuestion = 'MessageQuestion',
  Messages = 'Messages',
  MetamaskFoxFilled = 'MetamaskFoxFilled',
  MetamaskFoxOutline = 'MetamaskFoxOutline',
  MinusBold = 'MinusBold',
  MoneyBag = 'MoneyBag',
  MoreHorizontal = 'MoreHorizontal',
  MoreVertical = 'MoreVertical',
  MusdFilled = 'MusdFilled',
  Musd = 'Musd',
  Notification = 'Notification',
  Plant = 'Plant',
  Plug = 'Plug',
  QrCode = 'QrCode',
  Question = 'Question',
  Received = 'Received',
  Refresh = 'Refresh',
  Scan = 'Scan',
  Search = 'Search',
  SecurityKey = 'SecurityKey',
  SecuritySearch = 'SecuritySearch',
  SecurityTick = 'SecurityTick',
  Send = 'Send',
  Setting = 'Setting',
  Share = 'Share',
  SnapsMobile = 'SnapsMobile',
  Snaps = 'Snaps',
  Sparkle = 'Sparkle',
  Speedometer = 'Speedometer',
  StarFilled = 'StarFilled',
  SwapHorizontal = 'SwapHorizontal',
  SwapVertical = 'SwapVertical',
  Telegram = 'Telegram',
  ThumbDownFilled = 'ThumbDownFilled',
  ThumbDown = 'ThumbDown',
  ThumbUpFilled = 'ThumbUpFilled',
  ThumbUp = 'ThumbUp',
  Trash = 'Trash',
  TrendDown = 'TrendDown',
  TrendUp = 'TrendUp',
  Trophy = 'Trophy',
  UserCheck = 'UserCheck',
  VerifiedFilled = 'VerifiedFilled',
  Wallet = 'Wallet',
  Warning = 'Warning',
}
