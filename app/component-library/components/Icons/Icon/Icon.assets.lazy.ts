/* eslint-disable import/prefer-default-export, @typescript-eslint/no-var-requires, @typescript-eslint/no-require-imports, global-require */
import { IconName } from './Icon.types';

/**
 * Lazy-loaded icon assets using explicit requires in a switch statement.
 * Icons are only loaded when first accessed, preventing the expensive
 * upfront cost of loading all 280+ SVG files on first render.
 *
 * Note: This file uses require() for lazy loading instead of import statements.
 * Metro bundler can analyze these explicit requires at build time while still
 * enabling runtime lazy loading.
 */

// Cache for loaded icons
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconCache: Record<string, any> = {};

/**
 * Lazy icon loader using explicit requires.
 * Each icon is loaded only when first accessed.
 */
export const getIcon = (name: IconName) => {
  if (iconCache[name]) {
    return iconCache[name];
  }

  let icon;

  // Explicit switch case allows Metro to analyze imports at build time
  // while still loading them lazily at runtime
  switch (name) {
    case IconName.Accessibility:
      icon = require('./assets/accessibility.svg').default;
      break;
    case IconName.Activity:
      icon = require('./assets/activity.svg').default;
      break;
    case IconName.AddCard:
      icon = require('./assets/add-card.svg').default;
      break;
    case IconName.AddCircle:
      icon = require('./assets/add-circle.svg').default;
      break;
    case IconName.AddSquare:
      icon = require('./assets/add-square.svg').default;
      break;
    case IconName.Add:
      icon = require('./assets/add.svg').default;
      break;
    case IconName.Ai:
      icon = require('./assets/ai.svg').default;
      break;
    case IconName.AlternateEmail:
      icon = require('./assets/alternate-email.svg').default;
      break;
    case IconName.Apple:
      icon = require('./assets/apple.svg').default;
      break;
    case IconName.Apps:
      icon = require('./assets/apps.svg').default;
      break;
    case IconName.Arrow2Down:
      icon = require('./assets/arrow-2-down.svg').default;
      break;
    case IconName.Arrow2Left:
      icon = require('./assets/arrow-2-left.svg').default;
      break;
    case IconName.Arrow2Right:
      icon = require('./assets/arrow-2-right.svg').default;
      break;
    case IconName.Arrow2UpRight:
      icon = require('./assets/arrow-2-up-right.svg').default;
      break;
    case IconName.Arrow2Up:
      icon = require('./assets/arrow-2-up.svg').default;
      break;
    case IconName.ArrowCircleDown:
      icon = require('./assets/arrow-circle-down.svg').default;
      break;
    case IconName.ArrowCircleUp:
      icon = require('./assets/arrow-circle-up.svg').default;
      break;
    case IconName.ArrowDoubleLeft:
      icon = require('./assets/arrow-double-left.svg').default;
      break;
    case IconName.ArrowDoubleRight:
      icon = require('./assets/arrow-double-right.svg').default;
      break;
    case IconName.ArrowDown:
      icon = require('./assets/arrow-down.svg').default;
      break;
    case IconName.ArrowDropDownCircle:
      icon = require('./assets/arrow-drop-down-circle.svg').default;
      break;
    case IconName.ArrowLeft:
      icon = require('./assets/arrow-left.svg').default;
      break;
    case IconName.ArrowRight:
      icon = require('./assets/arrow-right.svg').default;
      break;
    case IconName.ArrowUp:
      icon = require('./assets/arrow-up.svg').default;
      break;
    case IconName.AttachMoney:
      icon = require('./assets/attach-money.svg').default;
      break;
    case IconName.Attachment:
      icon = require('./assets/attachment.svg').default;
      break;
    case IconName.Ban:
      icon = require('./assets/ban.svg').default;
      break;
    case IconName.BankAssured:
      icon = require('./assets/bank-assured.svg').default;
      break;
    case IconName.Bank:
      icon = require('./assets/bank.svg').default;
      break;
    case IconName.Bold:
      icon = require('./assets/bold.svg').default;
      break;
    case IconName.Book:
      icon = require('./assets/book.svg').default;
      break;
    case IconName.Bookmark:
      icon = require('./assets/bookmark.svg').default;
      break;
    case IconName.Bridge:
      icon = require('./assets/bridge.svg').default;
      break;
    case IconName.Briefcase:
      icon = require('./assets/briefcase.svg').default;
      break;
    case IconName.Bulb:
      icon = require('./assets/bulb.svg').default;
      break;
    case IconName.BuySell:
      icon = require('./assets/buy-sell.svg').default;
      break;
    case IconName.Cake:
      icon = require('./assets/cake.svg').default;
      break;
    case IconName.Calculator:
      icon = require('./assets/calculator.svg').default;
      break;
    case IconName.Calendar:
      icon = require('./assets/calendar.svg').default;
      break;
    case IconName.Call:
      icon = require('./assets/call.svg').default;
      break;
    case IconName.Camera:
      icon = require('./assets/camera.svg').default;
      break;
    case IconName.Campaign:
      icon = require('./assets/campaign.svg').default;
      break;
    case IconName.CardPos:
      icon = require('./assets/card-pos.svg').default;
      break;
    case IconName.Card:
      icon = require('./assets/card.svg').default;
      break;
    case IconName.Cash:
      icon = require('./assets/cash.svg').default;
      break;
    case IconName.Category:
      icon = require('./assets/category.svg').default;
      break;
    case IconName.Chart:
      icon = require('./assets/chart.svg').default;
      break;
    case IconName.CheckBold:
      icon = require('./assets/check-bold.svg').default;
      break;
    case IconName.Check:
      icon = require('./assets/check.svg').default;
      break;
    case IconName.CircleX:
      icon = require('./assets/circle-x.svg').default;
      break;
    case IconName.ClockFilled:
      icon = require('./assets/clock-filled.svg').default;
      break;
    case IconName.Clock:
      icon = require('./assets/clock.svg').default;
      break;
    case IconName.Close:
      icon = require('./assets/close.svg').default;
      break;
    case IconName.CloudDownload:
      icon = require('./assets/cloud-download.svg').default;
      break;
    case IconName.CloudUpload:
      icon = require('./assets/cloud-upload.svg').default;
      break;
    case IconName.Cloud:
      icon = require('./assets/cloud.svg').default;
      break;
    case IconName.CodeCircle:
      icon = require('./assets/code-circle.svg').default;
      break;
    case IconName.Code:
      icon = require('./assets/code.svg').default;
      break;
    case IconName.Coin:
      icon = require('./assets/coin.svg').default;
      break;
    case IconName.Collapse:
      icon = require('./assets/collapse.svg').default;
      break;
    case IconName.Confirmation:
      icon = require('./assets/confirmation.svg').default;
      break;
    case IconName.Connect:
      icon = require('./assets/connect.svg').default;
      break;
    case IconName.CopySuccess:
      icon = require('./assets/copy-success.svg').default;
      break;
    case IconName.Copy:
      icon = require('./assets/copy.svg').default;
      break;
    case IconName.CreditCheck:
      icon = require('./assets/credit-check.svg').default;
      break;
    case IconName.CurrencyFranc:
      icon = require('./assets/currency-franc.svg').default;
      break;
    case IconName.CurrencyLira:
      icon = require('./assets/currency-lira.svg').default;
      break;
    case IconName.CurrencyPound:
      icon = require('./assets/currency-pound.svg').default;
      break;
    case IconName.CurrencyYuan:
      icon = require('./assets/currency-yuan.svg').default;
      break;
    case IconName.Customize:
      icon = require('./assets/customize.svg').default;
      break;
    case IconName.Danger:
      icon = require('./assets/danger.svg').default;
      break;
    case IconName.DarkFilled:
      icon = require('./assets/dark-filled.svg').default;
      break;
    case IconName.Dark:
      icon = require('./assets/dark.svg').default;
      break;
    case IconName.Data:
      icon = require('./assets/data.svg').default;
      break;
    case IconName.Description:
      icon = require('./assets/description.svg').default;
      break;
    case IconName.Details:
      icon = require('./assets/details.svg').default;
      break;
    case IconName.Diagram:
      icon = require('./assets/diagram.svg').default;
      break;
    case IconName.DocumentCode:
      icon = require('./assets/document-code.svg').default;
      break;
    case IconName.Download:
      icon = require('./assets/download.svg').default;
      break;
    case IconName.Draft:
      icon = require('./assets/draft.svg').default;
      break;
    case IconName.EcoLeaf:
      icon = require('./assets/eco-leaf.svg').default;
      break;
    case IconName.EditSquare:
      icon = require('./assets/edit-square.svg').default;
      break;
    case IconName.Edit:
      icon = require('./assets/edit.svg').default;
      break;
    case IconName.EncryptedAdd:
      icon = require('./assets/encrypted-add.svg').default;
      break;
    case IconName.Eraser:
      icon = require('./assets/eraser.svg').default;
      break;
    case IconName.Error:
      icon = require('./assets/error.svg').default;
      break;
    case IconName.Ethereum:
      icon = require('./assets/ethereum.svg').default;
      break;
    case IconName.Exchange:
      icon = require('./assets/exchange.svg').default;
      break;
    case IconName.ExpandVertical:
      icon = require('./assets/expand-vertical.svg').default;
      break;
    case IconName.Expand:
      icon = require('./assets/expand.svg').default;
      break;
    case IconName.ExploreFilled:
      icon = require('./assets/explore-filled.svg').default;
      break;
    case IconName.Explore:
      icon = require('./assets/explore.svg').default;
      break;
    case IconName.Export:
      icon = require('./assets/export.svg').default;
      break;
    case IconName.Extension:
      icon = require('./assets/extension.svg').default;
      break;
    case IconName.EyeSlash:
      icon = require('./assets/eye-slash.svg').default;
      break;
    case IconName.Eye:
      icon = require('./assets/eye.svg').default;
      break;
    case IconName.FaceId:
      icon = require('./assets/face-id.svg').default;
      break;
    case IconName.Feedback:
      icon = require('./assets/feedback.svg').default;
      break;
    case IconName.File:
      icon = require('./assets/file.svg').default;
      break;
    case IconName.Filter:
      icon = require('./assets/filter.svg').default;
      break;
    case IconName.Fingerprint:
      icon = require('./assets/fingerprint.svg').default;
      break;
    case IconName.Fire:
      icon = require('./assets/fire.svg').default;
      break;
    case IconName.FirstPage:
      icon = require('./assets/first-page.svg').default;
      break;
    case IconName.Flag:
      icon = require('./assets/flag.svg').default;
      break;
    case IconName.FlashSlash:
      icon = require('./assets/flash-slash.svg').default;
      break;
    case IconName.Flash:
      icon = require('./assets/flash.svg').default;
      break;
    case IconName.Flask:
      icon = require('./assets/flask.svg').default;
      break;
    case IconName.Flower:
      icon = require('./assets/flower.svg').default;
      break;
    case IconName.Folder:
      icon = require('./assets/folder.svg').default;
      break;
    case IconName.Forest:
      icon = require('./assets/forest.svg').default;
      break;
    case IconName.FullCircle:
      icon = require('./assets/full-circle.svg').default;
      break;
    case IconName.Gas:
      icon = require('./assets/gas.svg').default;
      break;
    case IconName.Gift:
      icon = require('./assets/gift.svg').default;
      break;
    case IconName.GlobalSearch:
      icon = require('./assets/global-search.svg').default;
      break;
    case IconName.Global:
      icon = require('./assets/global.svg').default;
      break;
    case IconName.Graph:
      icon = require('./assets/graph.svg').default;
      break;
    case IconName.Hardware:
      icon = require('./assets/hardware.svg').default;
      break;
    case IconName.HashTag:
      icon = require('./assets/hash-tag.svg').default;
      break;
    case IconName.HeartFilled:
      icon = require('./assets/heart-filled.svg').default;
      break;
    case IconName.Heart:
      icon = require('./assets/heart.svg').default;
      break;
    case IconName.Hierarchy:
      icon = require('./assets/hierarchy.svg').default;
      break;
    case IconName.HomeFilled:
      icon = require('./assets/home-filled.svg').default;
      break;
    case IconName.Home:
      icon = require('./assets/home.svg').default;
      break;
    case IconName.Image:
      icon = require('./assets/image.svg').default;
      break;
    case IconName.Info:
      icon = require('./assets/info.svg').default;
      break;
    case IconName.Inventory:
      icon = require('./assets/inventory.svg').default;
      break;
    case IconName.Joystick:
      icon = require('./assets/joystick.svg').default;
      break;
    case IconName.KeepFilled:
      icon = require('./assets/keep-filled.svg').default;
      break;
    case IconName.Keep:
      icon = require('./assets/keep.svg').default;
      break;
    case IconName.Key:
      icon = require('./assets/key.svg').default;
      break;
    case IconName.LastPage:
      icon = require('./assets/last-page.svg').default;
      break;
    case IconName.LightFilled:
      icon = require('./assets/light-filled.svg').default;
      break;
    case IconName.Light:
      icon = require('./assets/light.svg').default;
      break;
    case IconName.Link:
      icon = require('./assets/link.svg').default;
      break;
    case IconName.Loading:
      icon = require('./assets/loading.svg').default;
      break;
    case IconName.Location:
      icon = require('./assets/location.svg').default;
      break;
    case IconName.LockSlash:
      icon = require('./assets/lock-slash.svg').default;
      break;
    case IconName.Lock:
      icon = require('./assets/lock.svg').default;
      break;
    case IconName.LockedFilled:
      icon = require('./assets/locked-filled.svg').default;
      break;
    case IconName.Login:
      icon = require('./assets/login.svg').default;
      break;
    case IconName.Logout:
      icon = require('./assets/logout.svg').default;
      break;
    case IconName.Mail:
      icon = require('./assets/mail.svg').default;
      break;
    case IconName.Map:
      icon = require('./assets/map.svg').default;
      break;
    case IconName.Menu:
      icon = require('./assets/menu.svg').default;
      break;
    case IconName.MessageQuestion:
      icon = require('./assets/message-question.svg').default;
      break;
    case IconName.Messages:
      icon = require('./assets/messages.svg').default;
      break;
    case IconName.MetamaskFoxOutline:
      icon = require('./assets/metamask-fox-outline.svg').default;
      break;
    case IconName.Mic:
      icon = require('./assets/mic.svg').default;
      break;
    case IconName.MinusBold:
      icon = require('./assets/minus-bold.svg').default;
      break;
    case IconName.MinusSquare:
      icon = require('./assets/minus-square.svg').default;
      break;
    case IconName.Minus:
      icon = require('./assets/minus.svg').default;
      break;
    case IconName.Mobile:
      icon = require('./assets/mobile.svg').default;
      break;
    case IconName.MoneyBag:
      icon = require('./assets/money-bag.svg').default;
      break;
    case IconName.Money:
      icon = require('./assets/money.svg').default;
      break;
    case IconName.Monitor:
      icon = require('./assets/monitor.svg').default;
      break;
    case IconName.MoreHorizontal:
      icon = require('./assets/more-horizontal.svg').default;
      break;
    case IconName.MoreVertical:
      icon = require('./assets/more-vertical.svg').default;
      break;
    case IconName.MountainFlag:
      icon = require('./assets/mountain-flag.svg').default;
      break;
    case IconName.MusicNote:
      icon = require('./assets/music-note.svg').default;
      break;
    case IconName.Notification:
      icon = require('./assets/notification.svg').default;
      break;
    case IconName.PageInfo:
      icon = require('./assets/page-info.svg').default;
      break;
    case IconName.Palette:
      icon = require('./assets/palette.svg').default;
      break;
    case IconName.PasswordCheck:
      icon = require('./assets/password-check.svg').default;
      break;
    case IconName.Pending:
      icon = require('./assets/pending.svg').default;
      break;
    case IconName.People:
      icon = require('./assets/people.svg').default;
      break;
    case IconName.PersonCancel:
      icon = require('./assets/person-cancel.svg').default;
      break;
    case IconName.Pin:
      icon = require('./assets/pin.svg').default;
      break;
    case IconName.Plant:
      icon = require('./assets/plant.svg').default;
      break;
    case IconName.Plug:
      icon = require('./assets/plug.svg').default;
      break;
    case IconName.PlusAndMinus:
      icon = require('./assets/plus-and-minus.svg').default;
      break;
    case IconName.PolicyAlert:
      icon = require('./assets/policy-alert.svg').default;
      break;
    case IconName.Print:
      icon = require('./assets/print.svg').default;
      break;
    case IconName.PriorityHigh:
      icon = require('./assets/priority-high.svg').default;
      break;
    case IconName.PrivacyTip:
      icon = require('./assets/privacy-tip.svg').default;
      break;
    case IconName.ProgrammingArrows:
      icon = require('./assets/programming-arrows.svg').default;
      break;
    case IconName.Publish:
      icon = require('./assets/publish.svg').default;
      break;
    case IconName.QrCode:
      icon = require('./assets/qr-code.svg').default;
      break;
    case IconName.Question:
      icon = require('./assets/question.svg').default;
      break;
    case IconName.Receive:
      icon = require('./assets/receive.svg').default;
      break;
    case IconName.Received:
      icon = require('./assets/received.svg').default;
      break;
    case IconName.Refresh:
      icon = require('./assets/refresh.svg').default;
      break;
    case IconName.RemoveMinus:
      icon = require('./assets/remove-minus.svg').default;
      break;
    case IconName.Report:
      icon = require('./assets/report.svg').default;
      break;
    case IconName.Rocket:
      icon = require('./assets/rocket.svg').default;
      break;
    case IconName.SaveFilled:
      icon = require('./assets/save-filled.svg').default;
      break;
    case IconName.Save:
      icon = require('./assets/save.svg').default;
      break;
    case IconName.Saving:
      icon = require('./assets/saving.svg').default;
      break;
    case IconName.ScanBarcode:
      icon = require('./assets/scan-barcode.svg').default;
      break;
    case IconName.ScanFocus:
      icon = require('./assets/scan-focus.svg').default;
      break;
    case IconName.Scan:
      icon = require('./assets/scan.svg').default;
      break;
    case IconName.Search:
      icon = require('./assets/search.svg').default;
      break;
    case IconName.SecurityAlert:
      icon = require('./assets/security-alert.svg').default;
      break;
    case IconName.SecurityCross:
      icon = require('./assets/security-cross.svg').default;
      break;
    case IconName.SecurityKey:
      icon = require('./assets/security-key.svg').default;
      break;
    case IconName.SecuritySearch:
      icon = require('./assets/security-search.svg').default;
      break;
    case IconName.SecuritySlash:
      icon = require('./assets/security-slash.svg').default;
      break;
    case IconName.SecurityTick:
      icon = require('./assets/security-tick.svg').default;
      break;
    case IconName.SecurityTime:
      icon = require('./assets/security-time.svg').default;
      break;
    case IconName.SecurityUser:
      icon = require('./assets/security-user.svg').default;
      break;
    case IconName.Security:
      icon = require('./assets/security.svg').default;
      break;
    case IconName.Send:
      icon = require('./assets/send.svg').default;
      break;
    case IconName.SentimentDissatisfied:
      icon = require('./assets/sentiment-dissatisfied.svg').default;
      break;
    case IconName.SentimentNeutral:
      icon = require('./assets/sentiment-neutral.svg').default;
      break;
    case IconName.SentimentSatisfied:
      icon = require('./assets/sentiment-satisfied.svg').default;
      break;
    case IconName.SentimentVerySatisfied:
      icon = require('./assets/sentiment-very-satisfied.svg').default;
      break;
    case IconName.SettingFilled:
      icon = require('./assets/setting-filled.svg').default;
      break;
    case IconName.Setting:
      icon = require('./assets/setting.svg').default;
      break;
    case IconName.Share:
      icon = require('./assets/share.svg').default;
      break;
    case IconName.ShieldLock:
      icon = require('./assets/shield-lock.svg').default;
      break;
    case IconName.ShoppingBag:
      icon = require('./assets/shopping-bag.svg').default;
      break;
    case IconName.ShoppingCart:
      icon = require('./assets/shopping-cart.svg').default;
      break;
    case IconName.SignalCellular:
      icon = require('./assets/signal-cellular.svg').default;
      break;
    case IconName.Slash:
      icon = require('./assets/slash.svg').default;
      break;
    case IconName.Sms:
      icon = require('./assets/sms.svg').default;
      break;
    case IconName.SnapsMobile:
      icon = require('./assets/snaps-mobile.svg').default;
      break;
    case IconName.SnapsPlus:
      icon = require('./assets/snaps-plus.svg').default;
      break;
    case IconName.SnapsRound:
      icon = require('./assets/snaps-round.svg').default;
      break;
    case IconName.Snaps:
      icon = require('./assets/snaps.svg').default;
      break;
    case IconName.SortByAlpha:
      icon = require('./assets/sort-by-alpha.svg').default;
      break;
    case IconName.Sort:
      icon = require('./assets/sort.svg').default;
      break;
    case IconName.Sparkle:
      icon = require('./assets/sparkle.svg').default;
      break;
    case IconName.Speed:
      icon = require('./assets/speed.svg').default;
      break;
    case IconName.Speedometer:
      icon = require('./assets/speedometer.svg').default;
      break;
    case IconName.Square:
      icon = require('./assets/square.svg').default;
      break;
    case IconName.Stake:
      icon = require('./assets/stake.svg').default;
      break;
    case IconName.StarFilled:
      icon = require('./assets/star-filled.svg').default;
      break;
    case IconName.Star:
      icon = require('./assets/star.svg').default;
      break;
    case IconName.Start:
      icon = require('./assets/start.svg').default;
      break;
    case IconName.Storefront:
      icon = require('./assets/storefront.svg').default;
      break;
    case IconName.Student:
      icon = require('./assets/student.svg').default;
      break;
    case IconName.SwapHorizontal:
      icon = require('./assets/swap-horizontal.svg').default;
      break;
    case IconName.SwapVertical:
      icon = require('./assets/swap-vertical.svg').default;
      break;
    case IconName.TabClose:
      icon = require('./assets/tab-close.svg').default;
      break;
    case IconName.TableRow:
      icon = require('./assets/table-row.svg').default;
      break;
    case IconName.Tablet:
      icon = require('./assets/tablet.svg').default;
      break;
    case IconName.Tag:
      icon = require('./assets/tag.svg').default;
      break;
    case IconName.ThumbDownFilled:
      icon = require('./assets/thumb-down-filled.svg').default;
      break;
    case IconName.ThumbDown:
      icon = require('./assets/thumb-down.svg').default;
      break;
    case IconName.ThumbUpFilled:
      icon = require('./assets/thumb-up-filled.svg').default;
      break;
    case IconName.ThumbUp:
      icon = require('./assets/thumb-up.svg').default;
      break;
    case IconName.Tint:
      icon = require('./assets/tint.svg').default;
      break;
    case IconName.Tooltip:
      icon = require('./assets/tooltip.svg').default;
      break;
    case IconName.Translate:
      icon = require('./assets/translate.svg').default;
      break;
    case IconName.Trash:
      icon = require('./assets/trash.svg').default;
      break;
    case IconName.TrendDown:
      icon = require('./assets/trend-down.svg').default;
      break;
    case IconName.TrendUp:
      icon = require('./assets/trend-up.svg').default;
      break;
    case IconName.Undo:
      icon = require('./assets/undo.svg').default;
      break;
    case IconName.Unfold:
      icon = require('./assets/unfold.svg').default;
      break;
    case IconName.UnlockedFilled:
      icon = require('./assets/unlocked-filled.svg').default;
      break;
    case IconName.Unpin:
      icon = require('./assets/unpin.svg').default;
      break;
    case IconName.UploadFile:
      icon = require('./assets/upload-file.svg').default;
      break;
    case IconName.Upload:
      icon = require('./assets/upload.svg').default;
      break;
    case IconName.Usb:
      icon = require('./assets/usb.svg').default;
      break;
    case IconName.UserCheck:
      icon = require('./assets/user-check.svg').default;
      break;
    case IconName.UserCircleAdd:
      icon = require('./assets/user-circle-add.svg').default;
      break;
    case IconName.UserCircleRemove:
      icon = require('./assets/user-circle-remove.svg').default;
      break;
    case IconName.UserCircle:
      icon = require('./assets/user-circle.svg').default;
      break;
    case IconName.User:
      icon = require('./assets/user.svg').default;
      break;
    case IconName.VerifiedFilled:
      icon = require('./assets/verified-filled.svg').default;
      break;
    case IconName.Verified:
      icon = require('./assets/verified.svg').default;
      break;
    case IconName.Videocam:
      icon = require('./assets/videocam.svg').default;
      break;
    case IconName.ViewColumn:
      icon = require('./assets/view-column.svg').default;
      break;
    case IconName.ViewInAr:
      icon = require('./assets/view-in-ar.svg').default;
      break;
    case IconName.VolumeOff:
      icon = require('./assets/volume-off.svg').default;
      break;
    case IconName.VolumeUp:
      icon = require('./assets/volume-up.svg').default;
      break;
    case IconName.WalletFilled:
      icon = require('./assets/wallet-filled.svg').default;
      break;
    case IconName.Wallet:
      icon = require('./assets/wallet.svg').default;
      break;
    case IconName.Warning:
      icon = require('./assets/warning.svg').default;
      break;
    case IconName.WebTraffic:
      icon = require('./assets/web-traffic.svg').default;
      break;
    case IconName.Widgets:
      icon = require('./assets/widgets.svg').default;
      break;
    case IconName.WifiOff:
      icon = require('./assets/wifi-off.svg').default;
      break;
    case IconName.Wifi:
      icon = require('./assets/wifi.svg').default;
      break;
    case IconName.X:
      icon = require('./assets/x.svg').default;
      break;
    default:
      throw new Error(`Icon "${name}" not found`);
  }

  iconCache[name] = icon;
  return icon;
};
