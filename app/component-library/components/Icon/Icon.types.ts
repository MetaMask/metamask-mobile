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
  name: IconName;
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
  [key in IconName]: React.FC<SvgProps>;
};

///////////////////////////////////////////////////////
// This is generated code - Manually add types above
// DO NOT EDIT - Use generate-assets.js
///////////////////////////////////////////////////////

/**
 * Icon names
 */
export enum IconName {
  AddOutline = 'AddOutline',
  AddSquareFilled = 'AddSquareFilled',
  Arrow2DownOutline = 'Arrow2DownOutline',
  Arrow2LeftOutline = 'Arrow2LeftOutline',
  Arrow2RightOutline = 'Arrow2RightOutline',
  Arrow2UpOutline = 'Arrow2UpOutline',
  ArrowDownOutline = 'ArrowDownOutline',
  ArrowLeftOutline = 'ArrowLeftOutline',
  ArrowRightOutline = 'ArrowRightOutline',
  ArrowUpOutline = 'ArrowUpOutline',
  BankFilled = 'BankFilled',
  BankTokenFilled = 'BankTokenFilled',
  BookFilled = 'BookFilled',
  BookmarkFilled = 'BookmarkFilled',
  CalculatorFilled = 'CalculatorFilled',
  CardFilled = 'CardFilled',
  CardPosFilled = 'CardPosFilled',
  CardTokenFilled = 'CardTokenFilled',
  CategoryFilled = 'CategoryFilled',
  ChartFilled1 = 'ChartFilled1',
  ChartFilled = 'ChartFilled',
  CheckBoxOffOutline = 'CheckBoxOffOutline',
  CheckBoxOnFilled = 'CheckBoxOnFilled',
  CheckCircleOffOutline = 'CheckCircleOffOutline',
  CheckCircleOnFilled = 'CheckCircleOnFilled',
  CheckOutline = 'CheckOutline',
  ClockFilled = 'ClockFilled',
  CloseOutline = 'CloseOutline',
  CodeCircleFilled = 'CodeCircleFilled',
  CoinFilled = 'CoinFilled',
  ConnectFilled = 'ConnectFilled',
  CopyFilled = 'CopyFilled',
  CopySuccessFilled = 'CopySuccessFilled',
  DangerFilled = 'DangerFilled',
  DarkFilled = 'DarkFilled',
  DataFilled = 'DataFilled',
  DiagramOutline = 'DiagramOutline',
  DocumentCodeFilled = 'DocumentCodeFilled',
  EditFilled = 'EditFilled',
  EraserFilled = 'EraserFilled',
  ExpandOutline = 'ExpandOutline',
  ExploreFilled = 'ExploreFilled',
  ExportOutline = 'ExportOutline',
  EyeFilled = 'EyeFilled',
  EyeSlashFilled = 'EyeSlashFilled',
  FilterOutline = 'FilterOutline',
  FlagFilled = 'FlagFilled',
  FlashFilled = 'FlashFilled',
  FlashSlashFilled = 'FlashSlashFilled',
  FullCircleFilled = 'FullCircleFilled',
  GasFilled = 'GasFilled',
  GlobalFilled = 'GlobalFilled',
  GlobalSearchFilled = 'GlobalSearchFilled',
  GraphFilled = 'GraphFilled',
  HeartFilled = 'HeartFilled',
  HierarchyFilled = 'HierarchyFilled',
  HomeFilled = 'HomeFilled',
  ImportOutline = 'ImportOutline',
  InfoFilled = 'InfoFilled',
  KeyFilled = 'KeyFilled',
  LightFilled = 'LightFilled',
  Link2Outline = 'Link2Outline',
  LinkOutline = 'LinkOutline',
  LoadingFilled = 'LoadingFilled',
  LockCircleFilled = 'LockCircleFilled',
  LockFilled = 'LockFilled',
  LockSlashFilled = 'LockSlashFilled',
  LoginOutline = 'LoginOutline',
  LogoutOutline = 'LogoutOutline',
  MenuOutline = 'MenuOutline',
  MessageQuestionFilled = 'MessageQuestionFilled',
  MessagesFilled = 'MessagesFilled',
  MinusOutine = 'MinusOutine',
  MinusSquareFilled = 'MinusSquareFilled',
  MobileFilled = 'MobileFilled',
  MoneyFilled = 'MoneyFilled',
  MonitorFilled = 'MonitorFilled',
  MoreHorizontalOutline = 'MoreHorizontalOutline',
  MoreVerticalOutline = 'MoreVerticalOutline',
  NotificationCircleFilled = 'NotificationCircleFilled',
  NotificationFilled = 'NotificationFilled',
  PasswordCheckFilled = 'PasswordCheckFilled',
  PeopleFilled = 'PeopleFilled',
  ProgrammingArrowsFilled = 'ProgrammingArrowsFilled',
  QuestionFilled = 'QuestionFilled',
  ReceivedOutline = 'ReceivedOutline',
  RefreshOutline = 'RefreshOutline',
  SaveFilled = 'SaveFilled',
  ScanBarcodeFilled = 'ScanBarcodeFilled',
  ScanFilled = 'ScanFilled',
  ScanFocusOutline = 'ScanFocusOutline',
  ScrollFilled = 'ScrollFilled',
  SearchFilled = 'SearchFilled',
  SecurityCardFilled = 'SecurityCardFilled',
  SecurityCrossFilled = 'SecurityCrossFilled',
  SecurityFilled = 'SecurityFilled',
  SecurityKeyFilled = 'SecurityKeyFilled',
  SecuritySearchFilled = 'SecuritySearchFilled',
  SecuritySlashFilled = 'SecuritySlashFilled',
  SecurityTickFilled = 'SecurityTickFilled',
  SecurityTimeFilled = 'SecurityTimeFilled',
  SecurityUserFilled = 'SecurityUserFilled',
  Send1Filled = 'Send1Filled',
  Send2Outline = 'Send2Outline',
  SettingFilled = 'SettingFilled',
  SlashFilled = 'SlashFilled',
  SnapsFilled = 'SnapsFilled',
  SnapsMobileFilled = 'SnapsMobileFilled',
  SnapsPlusFilled = 'SnapsPlusFilled',
  SpeedometerFilled = 'SpeedometerFilled',
  StarFilled = 'StarFilled',
  StudentFilled = 'StudentFilled',
  SwapHorizontalOutline = 'SwapHorizontalOutline',
  SwapVertivalFilled = 'SwapVertivalFilled',
  TagFilled = 'TagFilled',
  TildeOutline = 'TildeOutline',
  TimerTimer = 'TimerTimer',
  TrashFilled = 'TrashFilled',
  TrendDownFilled = 'TrendDownFilled',
  TrendUpFilled = 'TrendUpFilled',
  UserAddFilled1 = 'UserAddFilled1',
  UserAddFilled = 'UserAddFilled',
  UserCircleAddFilled = 'UserCircleAddFilled',
  UserCircleFilled = 'UserCircleFilled',
  UserFilled = 'UserFilled',
  UserMinusFilled = 'UserMinusFilled',
  UserRemoveFilled = 'UserRemoveFilled',
  UserSearchFilled = 'UserSearchFilled',
  UserTickFilled = 'UserTickFilled',
  WalletCardFilled = 'WalletCardFilled',
  WalletFilled = 'WalletFilled',
  WalletMoneyFilled = 'WalletMoneyFilled',
  WarningFilled = 'WarningFilled',
}
