# Changelog

## Current Main Branch

## 7.3.0 - Jul 13, 2023
### Added
- [#6220](https://github.com/MetaMask/metamask-mobile/pull/6220): feat: Upgrade React Native to 0.71.6
- [#6596](https://github.com/MetaMask/metamask-mobile/pull/6596): feat: Memoise token balance controler hook
- [#6639](https://github.com/MetaMask/metamask-mobile/pull/6639): feat: approval flow for add & switch network
- [#6352](https://github.com/MetaMask/metamask-mobile/pull/6352): feat(action): github action to automatically add label "release-x.y.z" when PRs get merged
- [#6576](https://github.com/MetaMask/metamask-mobile/pull/6576): feat: New Ui for permissions dapp screen
- [#6212](https://github.com/MetaMask/metamask-mobile/pull/6212): feat: trigger qrsigning modal using approval controller
- [#6602](https://github.com/MetaMask/metamask-mobile/pull/6602): feat: Add BottomSheetContent
- [#6617](https://github.com/MetaMask/metamask-mobile/pull/6617): feat: Update Overlay and add BottomSheetOverlay
- [#6489](https://github.com/MetaMask/metamask-mobile/pull/6489): feat: [MC 0.75] Show test network toggle
- [#6499](https://github.com/MetaMask/metamask-mobile/pull/6499): feat: `eth_accounts` return all permitted accounts

### Changed
- [#6662](https://github.com/MetaMask/metamask-mobile/pull/6662): refactor: Remove dead network controller code
- [#6664](https://github.com/MetaMask/metamask-mobile/pull/6664): refactor: Simplify `isMainnet` utility function
- [#6723](https://github.com/MetaMask/metamask-mobile/pull/6723): refactor: Updated checkbox style and icon
- [#6552](https://github.com/MetaMask/metamask-mobile/pull/6552): refactor: Update MultiSelectItem to use ListItem
- [#6551](https://github.com/MetaMask/metamask-mobile/pull/6551): refactor: Update SelectItem to use ListItem
- [#6724](https://github.com/MetaMask/metamask-mobile/pull/6724): refactor: Updated Label Text Variant
- [#6673](https://github.com/MetaMask/metamask-mobile/pull/6673): refactor: Use selectors for network state access
- [#6666](https://github.com/MetaMask/metamask-mobile/pull/6666): refactor: Simplify engine service
- [#6641](https://github.com/MetaMask/metamask-mobile/pull/6641): refactor: approve and reject transactions using approval controller

### Fixed
- [#6741](https://github.com/MetaMask/metamask-mobile/pull/6741): fix: onPress prop added to SelectItem component
- [#6722](https://github.com/MetaMask/metamask-mobile/pull/6722): fix: WC2 error management and SDK 'authorized' event
- [#6729](https://github.com/MetaMask/metamask-mobile/pull/6729): fix: update multi select snapshot
- [#6714](https://github.com/MetaMask/metamask-mobile/pull/6714): fix: "Assets Overview" disclaimer text color
- [#6678](https://github.com/MetaMask/metamask-mobile/pull/6678): fix: Update Confirmation Sign Message detox spec file
- [#6671](https://github.com/MetaMask/metamask-mobile/pull/6671): fix: added contact alias to destination address on send flow
- [#6637](https://github.com/MetaMask/metamask-mobile/pull/6637): fix: Support Decimal Comma for Token Custom Spend Cap

## 7.2.0 - Jun 05, 2023
### Added
- [#6632](https://github.com/MetaMask/metamask-mobile/pull/6632): feat: add linea mainnet alert message
- [#6496](https://github.com/MetaMask/metamask-mobile/pull/6496): feat(551): add Linea Mainnet
- [#6494](https://github.com/MetaMask/metamask-mobile/pull/6494): feat: Update banner component to show/hide details section
- [#6539](https://github.com/MetaMask/metamask-mobile/pull/6539): feat: [MC 0.5] Remove drawer and add remain options to settings tab
- [#6378](https://github.com/MetaMask/metamask-mobile/pull/6378): feat: Add eth_sign friction
- [#6534](https://github.com/MetaMask/metamask-mobile/pull/6534): feat(action): remove labels after issue closed
- [#6570](https://github.com/MetaMask/metamask-mobile/pull/6570): feat: Translations for the disconnected account toast
- [#6452](https://github.com/MetaMask/metamask-mobile/pull/6452): feat: [MC 0.5] - Add Account management actions
- [#5591](https://github.com/MetaMask/metamask-mobile/pull/5591): feat: Custom Spend Allowance
- [#6426](https://github.com/MetaMask/metamask-mobile/pull/6426): feat: Componentize ListItem
- [#6514](https://github.com/MetaMask/metamask-mobile/pull/6514): feat: Componentize BottomSheetFooter
- [#6466](https://github.com/MetaMask/metamask-mobile/pull/6466): feat: componentize BottomSheetHeader
- [#6294](https://github.com/MetaMask/metamask-mobile/pull/6294): feat: [MC 0.5] - Activity view and Settings on the tab bar
- [#6486](https://github.com/MetaMask/metamask-mobile/pull/6486): feat: Add disabled prop on base button

### Changed
- [#6612](https://github.com/MetaMask/metamask-mobile/pull/6612): chore: approve txn when gas estimation ready
- [#6054](https://github.com/MetaMask/metamask-mobile/pull/6054): chore: Improve TagURL
- [#6520](https://github.com/MetaMask/metamask-mobile/pull/6520): chore: improve variable name
- [#6597](https://github.com/MetaMask/metamask-mobile/pull/6597): chore: rm unused prepareFullTransaction
- [#6291](https://github.com/MetaMask/metamask-mobile/pull/6291): refactor: trigger transaction modals using approval requests
- [#5751](https://github.com/MetaMask/metamask-mobile/pull/5751): chore: Keystone links
- [#6541](https://github.com/MetaMask/metamask-mobile/pull/6541): chore: Delete an unused hook
- [#6530](https://github.com/MetaMask/metamask-mobile/pull/6530): chore: pending review feedback for token details related changes
- [#6401](https://github.com/MetaMask/metamask-mobile/pull/6401): refactor: handle watch asset accept and reject using ApprovalController only
- [#6529](https://github.com/MetaMask/metamask-mobile/pull/6529): chore: adding english string for advanced settings eth_sign warning
- [#6026](https://github.com/MetaMask/metamask-mobile/pull/6026): chore: Add toggle to enable/disable multi account balances fetching
- [#6512](https://github.com/MetaMask/metamask-mobile/pull/6512): chore: upgrade to cocoapods 1.12.0
- [#6487](https://github.com/MetaMask/metamask-mobile/pull/6487): chore: new Show test networks translation
- [#6357](https://github.com/MetaMask/metamask-mobile/pull/6357): refactor: use approval controller for watch asset confirmation

### Fixed
- [#6549](https://github.com/MetaMask/metamask-mobile/pull/6549): fix: Networks text alignement
- [#6634](https://github.com/MetaMask/metamask-mobile/pull/6634): fix: disable next button if custom input is invalid
- [#6491](https://github.com/MetaMask/metamask-mobile/pull/6491): fix: refactor linea testnet implementation
- [#6358](https://github.com/MetaMask/metamask-mobile/pull/6358): fix: No Warning appears when a Dapp sets a really high Fees for a tx, potentially loosing all user funds
- [#6592](https://github.com/MetaMask/metamask-mobile/pull/6592): fix: Nonce too low error on Approve ERC20 and ERC721 transactions
- [#6577](https://github.com/MetaMask/metamask-mobile/pull/6577): fix: onBoarding wizard horizontal alignment on step1 and on browser step
- [#6598](https://github.com/MetaMask/metamask-mobile/pull/6598): fix: Hold to reveal Spanish copy
- [#6523](https://github.com/MetaMask/metamask-mobile/pull/6523): fix: Network logo to represent first letter of network
- [#6560](https://github.com/MetaMask/metamask-mobile/pull/6560): fix: asset page header transition
- [#6473](https://github.com/MetaMask/metamask-mobile/pull/6473): fix: fix for swaps button displaying on unsupported networks
- [#6464](https://github.com/MetaMask/metamask-mobile/pull/6464): fix: bug domain not shown on signature
- [#6517](https://github.com/MetaMask/metamask-mobile/pull/6517): fix: remove duplicate ganache steps definitions
- [#6299](https://github.com/MetaMask/metamask-mobile/pull/6299): fix: for from address balance shown for ERC20 transfers
- [#6471](https://github.com/MetaMask/metamask-mobile/pull/6471): fix: Approve default ERC20

## 7.1.0 - Jun 20, 2023
 - [#6334](https://github.com/MetaMask/metamask-mobile/pull/6334): feat: Aurora Token Detection
 - [#6351](https://github.com/MetaMask/metamask-mobile/pull/6351): feat: use thunk to handle processed order side effects
 - [#5829](https://github.com/MetaMask/metamask-mobile/pull/5829): feat: order of browser page load events
 - [#6230](https://github.com/MetaMask/metamask-mobile/pull/6230): feat: Asset Overview / Token Detail view redesign
 - [#6381](https://github.com/MetaMask/metamask-mobile/pull/6381): feat: add params validation to useSDKMethod hook
 - [#6365](https://github.com/MetaMask/metamask-mobile/pull/6365): feat: remove hardcoded selected network name
 - [#6421](https://github.com/MetaMask/metamask-mobile/pull/6421): feat: exclude legacy types from rate limiting
 - [#6354](https://github.com/MetaMask/metamask-mobile/pull/6354): feat: Trigger signing modals from approval requests
 - [#6432](https://github.com/MetaMask/metamask-mobile/pull/6432): ci(sonar): Configure SonarCloud Analysis on CI
 - [#6441](https://github.com/MetaMask/metamask-mobile/pull/6441): feat: use screen in on-ramp views tests
 - [#6442](https://github.com/MetaMask/metamask-mobile/pull/6442): fix(ci): Remove `restore-build` steps
 - [#6040](https://github.com/MetaMask/metamask-mobile/pull/6040): feat: validation to send amount input box
 - [#6311](https://github.com/MetaMask/metamask-mobile/pull/6311): fix: token balance displayed in approval pages
 - [#6406](https://github.com/MetaMask/metamask-mobile/pull/6406): chore: Use core signature controller
 - [#6439](https://github.com/MetaMask/metamask-mobile/pull/6439): fix: remove invalid accessibilityRole value
 - [#6427](https://github.com/MetaMask/metamask-mobile/pull/6427): refactor: Refactor unit tests for React Native 0.71.6 upgrade
 - [#6289](https://github.com/MetaMask/metamask-mobile/pull/6289): feat(ci): Sonar Action to work with SonarCloud
 - [#6366](https://github.com/MetaMask/metamask-mobile/pull/6366): feat(ci): Convert Bitrise Workflows to Pipelines
 - [#6350](https://github.com/MetaMask/metamask-mobile/pull/6350): fix: ENS name displayed on confirm send page
 - [#6192](https://github.com/MetaMask/metamask-mobile/pull/6192): chore: Show account balance in signature screen
 - [#6394](https://github.com/MetaMask/metamask-mobile/pull/6394): feat(ci): removed the matrix option from unit testing
 - [#6227](https://github.com/MetaMask/metamask-mobile/pull/6227): feat: [MC 0.5] Modal network selector replace by network selector sheet
 - [#6393](https://github.com/MetaMask/metamask-mobile/pull/6393): feat(ci): upgrade ruby to 3.0.0
 - [#6274](https://github.com/MetaMask/metamask-mobile/pull/6274): chore: Empty SiteURL and Null TagURL in modal
 - [#6137](https://github.com/MetaMask/metamask-mobile/pull/6137): chore: Clicking toAddress to add it to address book
 - [#6079](https://github.com/MetaMask/metamask-mobile/pull/6079): chore: Refactor sanitization middleware
 - [#6234](https://github.com/MetaMask/metamask-mobile/pull/6234): chore: Clear Privacy section
 - [#6342](https://github.com/MetaMask/metamask-mobile/pull/6342): chore: Improve processing of redirection URL
 - [#6374](https://github.com/MetaMask/metamask-mobile/pull/6374): chore: en.json with eth_sign
 - [#6214](https://github.com/MetaMask/metamask-mobile/pull/6214): chore: core signature controller
 - [#6328](https://github.com/MetaMask/metamask-mobile/pull/6328): chore(devDeps): bump webdriverio packages
 - [#6362](https://github.com/MetaMask/metamask-mobile/pull/6362): chore: Added retries
 - [#6125](https://github.com/MetaMask/metamask-mobile/pull/6125): chore: controller packages to match core v42
 - [#6124](https://github.com/MetaMask/metamask-mobile/pull/6124): chore: controller packages to match core v40
 - [#6345](https://github.com/MetaMask/metamask-mobile/pull/6345): chore: es.js file
 - [#6339](https://github.com/MetaMask/metamask-mobile/pull/6339): fix: yarn watch clean

## 7.0.1 - Jun 7, 2023
- [#6558](https://github.com/MetaMask/metamask-mobile/pull/6558): refactor(whats-new-modal): remove onramp content

## 7.0.0 - Jun 6, 2023
- [#6536](https://github.com/MetaMask/metamask-mobile/pull/6380): [FEATURE] WalletConnect v2 Integration (#6380)

## 6.6.0 - May 25, 2023
- [#5866](https://github.com/MetaMask/metamask-mobile/pull/5866): [FIX] sturdier check
- [#6340](https://github.com/MetaMask/metamask-mobile/pull/6340): [FIX] Missing network name onramp
- [#6325](https://github.com/MetaMask/metamask-mobile/pull/6325): [FEATURE] Add development environment to onramp-sdk
- [#6309](https://github.com/MetaMask/metamask-mobile/pull/6309): [FIX] Missing handler on mandatory modal
- [#6165](https://github.com/MetaMask/metamask-mobile/pull/6165): [FEATURE] Edit account name view
- [#5876](https://github.com/MetaMask/metamask-mobile/pull/5876): [FIX] Gas is not re-calculated when updating a transaction
- [#6093](https://github.com/MetaMask/metamask-mobile/pull/6093): [FEATURE] Account actions on wallet view
- [#6253](https://github.com/MetaMask/metamask-mobile/pull/6253): [FIX] Confirm button should be disabled if account has no balance
- [#6097](https://github.com/MetaMask/metamask-mobile/pull/6097): [UPDATE] Extracting out signature request related code from RootRPCMethodsUI conponent
- [#6246](https://github.com/MetaMask/metamask-mobile/pull/6246): [FIX] Wrong to account information on confirmation page
- [#6085](https://github.com/MetaMask/metamask-mobile/pull/6085): [FEATURE] Update account section with card
- [#6255](https://github.com/MetaMask/metamask-mobile/pull/6255): [UPDATE] Onboarding translation updated
- [#6210](https://github.com/MetaMask/metamask-mobile/pull/6210): [UPDATE] Extend the readme documentation to cover E2E testing in more detail.
- [#6249](https://github.com/MetaMask/metamask-mobile/pull/6249): [FIX] Terms of Use checkbox test id
- [#6228](https://github.com/MetaMask/metamask-mobile/pull/6228): [UPDATE] Checkbox component
- [#6226](https://github.com/MetaMask/metamask-mobile/pull/6226): [UPDATE] Button's icon props and button org

## 6.5.0 - May 4, 2023
- [#5743](https://github.com/MetaMask/metamask-mobile/pull/5743): [FEATURE] On-ramp: Add buy-crypto deeplink
- [#6201](https://github.com/MetaMask/metamask-mobile/pull/6201): [FIX] [SDK] Missing redirect breaking backward compatibility
- [#6232](https://github.com/MetaMask/metamask-mobile/pull/6232): [FIX] bottom margin for detecting end of the page
- [#6166](https://github.com/MetaMask/metamask-mobile/pull/6166): [FEATURE] trigger walletconnect modal using approval controller
- [#6223](https://github.com/MetaMask/metamask-mobile/pull/6223): [IMPROVEMENT] Update to Node.js v16
- [#6051](https://github.com/MetaMask/metamask-mobile/pull/6051): [FEATURE] Total balance and portfolio button changed
- [#6156](https://github.com/MetaMask/metamask-mobile/pull/6156): [IMPROVEMENT] On-ramp: Use dynamic list of networks
- [#6145](https://github.com/MetaMask/metamask-mobile/pull/6145): [IMPROVEMENT] Synced and optimized icons
- [#6138](https://github.com/MetaMask/metamask-mobile/pull/6138): [FEATURE] On-ramp: Add orderProcessor exponential backoff for orders
- [#6139](https://github.com/MetaMask/metamask-mobile/pull/6139): [FEATURE] On-ramp: Add same amount rendering as the order details to the order list
- [#6189](https://github.com/MetaMask/metamask-mobile/pull/6189): [FEATURE] On-ramp: Remove hiding the provider modal when quotes refresh
- [#6216](https://github.com/MetaMask/metamask-mobile/pull/6216): [IMPROVEMENT] account icon matches user's preferred identicon
- [#5956](https://github.com/MetaMask/metamask-mobile/pull/5956): [IMPROVEMENT] Show token symbol in verify contract details
- [#5458](https://github.com/MetaMask/metamask-mobile/pull/5458): [IMPROVEMENT] Support sepolia network
- [#6185](https://github.com/MetaMask/metamask-mobile/pull/6185): [FIX] remove pubnub package and associated sync with extension code
- [#6181](https://github.com/MetaMask/metamask-mobile/pull/6181): [IMPROVEMENT] Componentize Header Component
- [#6153](https://github.com/MetaMask/metamask-mobile/pull/6153): [IMPROVEMENT] On-ramp: Refactor order selector by id
- [#6044](https://github.com/MetaMask/metamask-mobile/pull/6044): [IMPROVEMENT] Componentize Badge and Badge Wrapper
- [#6180](https://github.com/MetaMask/metamask-mobile/pull/6180): [IMPROVEMENT] Componentized Overlay Component
- [#6173](https://github.com/MetaMask/metamask-mobile/pull/6173): [REFACTOR] Auto Lock section
- [#6174](https://github.com/MetaMask/metamask-mobile/pull/6174): [IMPROVEMENT] Update Tab bar styles
- [#6056](https://github.com/MetaMask/metamask-mobile/pull/6056): [IMPROVEMENT] Show Identicon for unknown token and if token icon is unknown
- [#6076](https://github.com/MetaMask/metamask-mobile/pull/6076): [BUGFIX] Fixes WalletConnect deep links (wc:// schema) not working properly
- [#6157](https://github.com/MetaMask/metamask-mobile/pull/6157): [REFACTOR] Change Password setting
- [#5718](https://github.com/MetaMask/metamask-mobile/pull/5718): [FIX] Nonce Too Low for Approve Transaction

## 6.4.0 - Apr 20, 2023
- [#6144](https://github.com/MetaMask/metamask-mobile/pull/6144): [FEATURE] New Crowdin translations by Github Action
- [#6143](https://github.com/MetaMask/metamask-mobile/pull/6143): [UPDATE] Crowdin token to use METAMASKBOT_CROWDIN_TOKEN
- [#5627](https://github.com/MetaMask/metamask-mobile/pull/5627): [IMPROVEMENT] Refactor remaining `web3-provider-engine` methods
- [#6082](https://github.com/MetaMask/metamask-mobile/pull/6082): [IMPROVEMENT] Remove inactive IPFS providers
- [#5620](https://github.com/MetaMask/metamask-mobile/pull/5620): [IMPROVEMENT] Refactor RPC `getAccounts` usage
- [#6122](https://github.com/MetaMask/metamask-mobile/pull/6122): [FIX] TypeError: undefined is not an object (evaluating 'n.find')
- [#6134](https://github.com/MetaMask/metamask-mobile/pull/6134): [REFACTOR] Reveal Private Key section
- [#6009](https://github.com/MetaMask/metamask-mobile/pull/6009): [FEATURE] On-ramp: Add what's new modal content
- [#5619](https://github.com/MetaMask/metamask-mobile/pull/5619): [IMPROVEMENT] Refactor `eth_sendTransaction` handler
- [#6058](https://github.com/MetaMask/metamask-mobile/pull/6058): [FIX] broken erc721 approve token link
- [#6020](https://github.com/MetaMask/metamask-mobile/pull/6020): [FEATURE][MC] Token list with network logo and token name
- [#5992](https://github.com/MetaMask/metamask-mobile/pull/5992): [FEATURE][MC] - Wallet actions on Tab bar
- [#5937](https://github.com/MetaMask/metamask-mobile/pull/5937): [FEATURE]Show internet protocol on confirmation screens
- [#6015](https://github.com/MetaMask/metamask-mobile/pull/6015): [UPDATE] sentry version and enable performance metrics
- [#6109](https://github.com/MetaMask/metamask-mobile/pull/6109): [FIX] linea network order in dropdown + remove feature toggle for linea (#6072)
- [#6081](https://github.com/MetaMask/metamask-mobile/pull/6081): [UPDATE] ESLint rules for scripts
- [#6006](https://github.com/MetaMask/metamask-mobile/pull/6006): [UPDATE] Upgrade xcode version
- [#6003](https://github.com/MetaMask/metamask-mobile/pull/6003): [IMPROVEMENT] Adding document to refactor send flow
- [#6060](https://github.com/MetaMask/metamask-mobile/pull/6060): [IMPROVEMENT] Refactor send transaction v2
- [#6037](https://github.com/MetaMask/metamask-mobile/pull/6037): [FEATURE] update sdk persistence
- [#5900](https://github.com/MetaMask/metamask-mobile/pull/5900): [IMPROVEMENT] Creating reusable address from/to component.
- [#5933](https://github.com/MetaMask/metamask-mobile/pull/5933): [IMPROVEMENT] Componentize Banner Component
- [#5927](https://github.com/MetaMask/metamask-mobile/pull/5927): [IMPROVEMENT] Componentize Form Components

## 6.3.0 - Apr 05, 2023
- [#6025](https://github.com/MetaMask/metamask-mobile/pull/6025): [FIX] Add url-parse lib to our MainNavigator
- [#6039](https://github.com/MetaMask/metamask-mobile/pull/6039): [ENHANCEMENT] Improve Android setup instructions
- [#5996](https://github.com/MetaMask/metamask-mobile/pull/5996): [ENHANCEMENT] Add document to refactor signature request code
- [#5961](https://github.com/MetaMask/metamask-mobile/pull/5961): [FIX] #5898 - Converting native ETH to fiat and fiat to native ETH results in wrong values beign displayed on the Amount screen
- [#5958](https://github.com/MetaMask/metamask-mobile/pull/5958): [FEATURE] add consensys zkevm (Linea) support
- [#5997](https://github.com/MetaMask/metamask-mobile/pull/5997): [FEATURE] Account selector on swaps screen
- [#6019](https://github.com/MetaMask/metamask-mobile/pull/6019): [ENHANCEMENT] On-ramp: Add #6009 strings
- [#6023](https://github.com/MetaMask/metamask-mobile/pull/6023): [ENHANCEMENT] disable back press and add margin to the bottom for accept ToU modal
- [#6016](https://github.com/MetaMask/metamask-mobile/pull/6016): [ENHANCEMENT] On-ramp: Add accessibility label to custom action images
- [#5948](https://github.com/MetaMask/metamask-mobile/pull/5948): [FEATURE] SDK Session Persistence
- [#5882](https://github.com/MetaMask/metamask-mobile/pull/5882): [FIX] Skip type checking library declaration files
- [#5975](https://github.com/MetaMask/metamask-mobile/pull/5975): [FIX] 18 JS type errors for TSC to output 683 TS/TSX errors
- [#5910](https://github.com/MetaMask/metamask-mobile/pull/5910): [ENHANCEMENT] E2E Permission system tests
- [#5839](https://github.com/MetaMask/metamask-mobile/pull/5839): [FIX] Clear Hex data when Token Transfer reverts ETH
- [#5930](https://github.com/MetaMask/metamask-mobile/pull/5930): [ENHANCEMENT] dispaly nft info in browser
- [#5785](https://github.com/MetaMask/metamask-mobile/pull/5785): [FEATURE] add portfolio button to asset action buttons
- [#5242](https://github.com/MetaMask/metamask-mobile/pull/5242): [FEATURE] Use Terms Modal
- [#5941](https://github.com/MetaMask/metamask-mobile/pull/5941): [FIX] bundle video in app to prevent crash when not available
- [#5669](https://github.com/MetaMask/metamask-mobile/pull/5669): [UPDATE] http-cache-semantics from 4.1.0 to 4.1.1
- [#5959](https://github.com/MetaMask/metamask-mobile/pull/5959): [UPDATE] @xmldom/xmldom from 0.8.3 to 0.8.6
- [#5962](https://github.com/MetaMask/metamask-mobile/pull/5962): [FIX] Remove select address as a prop on App index.js
- [#5964](https://github.com/MetaMask/metamask-mobile/pull/5964): [FEATURE] Added translations for MC 0.5
- [#4421](https://github.com/MetaMask/metamask-mobile/pull/4421): [FEATURE] Vault corruption recovery flow
- [#5327](https://github.com/MetaMask/metamask-mobile/pull/5327): [FEATURE] Verify Contract Details

## 6.2.0 - Mar 21, 2023
- [#5890](https://github.com/MetaMask/metamask-mobile/pull/5890): [FIX] Swap with wallet connect
- [#5807](https://github.com/MetaMask/metamask-mobile/pull/5807): [IMPROVEMENT] "preview build" support to Bitrise
- [#5924](https://github.com/MetaMask/metamask-mobile/pull/5924): [UPDATE] the README setup steps
- [#5901](https://github.com/MetaMask/metamask-mobile/pull/5901): [UPDATE] assets-controllers patch
- [#5870](https://github.com/MetaMask/metamask-mobile/pull/5870): [IMPROVEMENT] On-ramp: Add buy crypto home button
- [#5880](https://github.com/MetaMask/metamask-mobile/pull/5880): [UPDATE] Display internet protocol on the new origin pill
- [#5529](https://github.com/MetaMask/metamask-mobile/pull/5529): [IMPROVEMENT] Network Controller refactor to use the same selector
- [#5859](https://github.com/MetaMask/metamask-mobile/pull/5859): [UPDATE] scan icon on wallet view
- [#5868](https://github.com/MetaMask/metamask-mobile/pull/5868): [IMPROVEMENT] permitted account balance
- [#5842](https://github.com/MetaMask/metamask-mobile/pull/5842): [IMPROVEMENT] show the url protocol
- [#5309](https://github.com/MetaMask/metamask-mobile/pull/5309): [IMPROVEMENT] New transaction header for approve and approval modal
- [#5825](https://github.com/MetaMask/metamask-mobile/pull/5825): [Improvement] Send Token E2E test
- [#5857](https://github.com/MetaMask/metamask-mobile/pull/5857): [IMPROVEMENT] Cherry pick QR scan bug fixes from v6.1 to main
- [#5855](https://github.com/MetaMask/metamask-mobile/pull/5855): [IMPROVEMENT] dont render suspect links
- [#5827](https://github.com/MetaMask/metamask-mobile/pull/5827): [IMPROVEMENT] analytics: add missing property to connect completed event
- [#5711](https://github.com/MetaMask/metamask-mobile/pull/5711): [IMPROVEMENT] Improve signature request message
- [#5750](https://github.com/MetaMask/metamask-mobile/pull/5750): [FIX] Enable clipboard for private credentials
- [#5374](https://github.com/MetaMask/metamask-mobile/pull/5374): [IMPROVEMENT] Authentication refactor
- [#5775](https://github.com/MetaMask/metamask-mobile/pull/5775): [UPDATE] Security Privacy Remember me feature
- [#5803](https://github.com/MetaMask/metamask-mobile/pull/5803): [UPDATE] Sentry: remove DSN value from codebase
- [#5796](https://github.com/MetaMask/metamask-mobile/pull/5796): [UPDATE] `@metamask/phishing-controller` to v2

## 6.1.2 - Mar 03, 2023
- [#5925](https://github.com/MetaMask/metamask-mobile/pull/5925): [FIX] handle all ios biometric errors and create wallet
- [#5906](https://github.com/MetaMask/metamask-mobile/pull/5906): [FIX] Add try-catch to recreateVault

## 6.1.1 - Mar 01, 2023
- [#5848](https://github.com/MetaMask/metamask-mobile/pull/5848): [FIX] Remove default eth sign

## 6.1.0 - Feb 27, 2023
- [#5851](https://github.com/MetaMask/metamask-mobile/pull/5851): [FIX] Fix search network crasher
- [#5809](https://github.com/MetaMask/metamask-mobile/pull/5809): [FIX] Resolve tab bar merge conflicts
- [#5461](https://github.com/MetaMask/metamask-mobile/pull/5461): [IMPROVEMENT] On-ramp: Refactor Payment Methods view to componentization
- [#5813](https://github.com/MetaMask/metamask-mobile/pull/5813): [FEATURE] Add copy for portfolio button for translations
- [#5729](https://github.com/MetaMask/metamask-mobile/pull/5729): [FIX] Bump react-native-reanimated to 2.14.0
- [#5797](https://github.com/MetaMask/metamask-mobile/pull/5797): [IMPROVEMENT] Remove phishing list update engine removal
- [#5812](https://github.com/MetaMask/metamask-mobile/pull/5812): [CONTENT] Ledger Integration english content
- [#5806](https://github.com/MetaMask/metamask-mobile/pull/5806): [FIX] Screenshot Crash
- [#5678](https://github.com/MetaMask/metamask-mobile/pull/5678): [FIX] Updated hardware label to have the correct color
- [#5801](https://github.com/MetaMask/metamask-mobile/pull/5801): [FIX] Update icon name in SRPQuiz
- [#5800](https://github.com/MetaMask/metamask-mobile/pull/5800): [FIX] TabBarIconKey to TabBarLabel
- [#5725](https://github.com/MetaMask/metamask-mobile/pull/5725): [IMPROVEMENT] Show transfer view to user for approve with value
- [#5780](https://github.com/MetaMask/metamask-mobile/pull/5780): [FIX] Show token symbol when approving
- [#5791](https://github.com/MetaMask/metamask-mobile/pull/5791): [IMPROVEMENT] Adds 'ios' and 'android' to possible sources for MM SDK events
- [#5340](https://github.com/MetaMask/metamask-mobile/pull/5340): [IMPROVEMENT]Align icon names
- [#5399](https://github.com/MetaMask/metamask-mobile/pull/5399): [FIX] Fix bug with updating gas price for legacy transactions
- [#5778](https://github.com/MetaMask/metamask-mobile/pull/5778): [IMPROVEMENT] Set different CPU capacity in jest tests
- [#5777](https://github.com/MetaMask/metamask-mobile/pull/5777): [FIX] Fix/primary currency fiat insufficient funds error
- [#5776](https://github.com/MetaMask/metamask-mobile/pull/5776): [IMPROVEMENT] Add test for change password scenario
- [#5753](https://github.com/MetaMask/metamask-mobile/pull/5753): [FIX] Fix Slack e2e announcement
- [#5683](https://github.com/MetaMask/metamask-mobile/pull/5683): [FIX] RN Patch Version
- [#5768](https://github.com/MetaMask/metamask-mobile/pull/5768): [UPGRADE] Segment Analytics 2.13.0
- [#5587](https://github.com/MetaMask/metamask-mobile/pull/5587): [FIX] ERC721 Approve view
- [#5748](https://github.com/MetaMask/metamask-mobile/pull/5748): [IMPROVEMENT] E2e appium/add splash animation step
- [#5749](https://github.com/MetaMask/metamask-mobile/pull/5749): [FIX] Back navigation CTAs in RevealPrivateCredential view
- [#5744](https://github.com/MetaMask/metamask-mobile/pull/5744): [IMPROVEMENT] Fix sideway/formula audit
- [#5738](https://github.com/MetaMask/metamask-mobile/pull/5738): [FIX] On-ramp: upgrade on-ramp-sdk to v1.8.1
- [#5739](https://github.com/MetaMask/metamask-mobile/pull/5739): [FIX] Fix CVE-2023-25166 by resolving @sideway/formula to 3.0.1
- [#5666](https://github.com/MetaMask/metamask-mobile/pull/5666): [IMPROVEMENT] E2E appium/app launch times
- [#5719](https://github.com/MetaMask/metamask-mobile/pull/5719): [FIX] Remove false showBack param from order details
- [#5595](https://github.com/MetaMask/metamask-mobile/pull/5595): [IMPROVEMENT] On-ramp: Add orderProcessor index test
- [#5730](https://github.com/MetaMask/metamask-mobile/pull/5730): [FIX] French content for SRP Quiz
- [#5726](https://github.com/MetaMask/metamask-mobile/pull/5726): [FIX] Minor UI bugs in credential views
- [#5656](https://github.com/MetaMask/metamask-mobile/pull/5656): [FIX] ENS Resolves to Wrong Address when DeepLink
- [#5717](https://github.com/MetaMask/metamask-mobile/pull/5717): [IMPROVEMENT] Updated button usage to use full width
- [#5722](https://github.com/MetaMask/metamask-mobile/pull/5722): [FIX] Fix env variables syntax in step
- [#5679](https://github.com/MetaMask/metamask-mobile/pull/5679): [IMPROVEMENT] Update design-tokens version and remove screen size from TextVariants
- [#5713](https://github.com/MetaMask/metamask-mobile/pull/5713): [IMPROVEMENT] Updated ButtonBase to use flex-start instead of baseline
- [#5546](https://github.com/MetaMask/metamask-mobile/pull/5546): [IMPROVEMENT] Adding smoke and regression tags to tests
- [#5694](https://github.com/MetaMask/metamask-mobile/pull/5694): [IMPROVEMENT] Added missing step definition
- [#5343](https://github.com/MetaMask/metamask-mobile/pull/5343): [IMPROVEMENT] Align buttons with Figma
- [#5682](https://github.com/MetaMask/metamask-mobile/pull/5682): [IMPROVEMENT] Componentize TextInput
- [#5657](https://github.com/MetaMask/metamask-mobile/pull/5657): [FIX] fix the RequestTokenFlow E2E test
- [#5675](https://github.com/MetaMask/metamask-mobile/pull/5675): [FIX] Fix eslint commit hook
- [#5621](https://github.com/MetaMask/metamask-mobile/pull/5621): [IMPROVEMENT] Refactor static method middlware
- [#5218](https://github.com/MetaMask/metamask-mobile/pull/5218): [IMPROVEMENT] Improve deeplinks experience
- [#5608](https://github.com/MetaMask/metamask-mobile/pull/5608): [FIX] SRP recover when an error is thrown

## 6.0.1 - Feb 21, 2023
- [#5799](https://github.com/MetaMask/metamask-mobile/pull/5799): [FIX] Browser: handle unsupported URLs

## 6.0.0 - Feb 15, 2023
- [#5724](https://github.com/MetaMask/metamask-mobile/pull/5724): [FIX] Migrate dapps access into permission controller state
- [#5742](https://github.com/MetaMask/metamask-mobile/pull/5742): [FIX] ENS Resolves to Wrong Address when DeepLink
- [#5714](https://github.com/MetaMask/metamask-mobile/pull/5714): [FIX] Importing private key via QR code redirects to browser
- [#5709](https://github.com/MetaMask/metamask-mobile/pull/5709): [FIX] Settings networks icons were missing
- [#5062](https://github.com/MetaMask/metamask-mobile/pull/5062): [FEATURE] Implement Permission System
- [#5659](https://github.com/MetaMask/metamask-mobile/pull/5659): [IMPROVEMENT] E2E fix tapReminder step
- [#5641](https://github.com/MetaMask/metamask-mobile/pull/5641): [IMPROVEMENT] Use Set when filtering blocklist
- [#5655](https://github.com/MetaMask/metamask-mobile/pull/5655): [FIX] E2E adjust get started wait
- [#5650](https://github.com/MetaMask/metamask-mobile/pull/5650): [IMPROVEMENT] E2E appium request token
- [#5647](https://github.com/MetaMask/metamask-mobile/pull/5647): [IMPROVEMENT] Add introductory image to SRP Quiz
- [#5640](https://github.com/MetaMask/metamask-mobile/pull/5640): [IMPROVEMENT] Middleware - Include the request in the error params
- [#5632](https://github.com/MetaMask/metamask-mobile/pull/5632): [IMPROVEMENT] E2E appium folder structure change
- [#5579](https://github.com/MetaMask/metamask-mobile/pull/5579): [FEAT] Add friction to SRP reveal
- [#5551](https://github.com/MetaMask/metamask-mobile/pull/5551): [IMPROVEMENT] Refactor Personal Signature
- [#5626](https://github.com/MetaMask/metamask-mobile/pull/5626): [FIX] SRP Quiz content and translations
- [#5612](https://github.com/MetaMask/metamask-mobile/pull/5612): [FIX] Make Prettier work in wdio directory
- [#5605](https://github.com/MetaMask/metamask-mobile/pull/5605): [FIX] Handle ENS Address Error
- [#5600](https://github.com/MetaMask/metamask-mobile/pull/5600): [IMPROVEMENT] Refactor ProtectYourWallet section in the security section
- [#5586](https://github.com/MetaMask/metamask-mobile/pull/5586): [IMPROVEMENT] Stablize Addressbook and Networks flow tests
- [#5594](https://github.com/MetaMask/metamask-mobile/pull/5594): [UPGRADE] bumped ua-parser-js to 0.7.33
- [#5580](https://github.com/MetaMask/metamask-mobile/pull/5580): [UPGRADE] Bump cookiejar from 2.1.2 to 2.1.4
- [#5471](https://github.com/MetaMask/metamask-mobile/pull/5471): [UPGRADE] Bump luxon from 3.1.1 to 3.2.1
- [#5450](https://github.com/MetaMask/metamask-mobile/pull/5450): [UPGRADE] Bump json5 from 1.0.1 to 1.0.2
- [#5575](https://github.com/MetaMask/metamask-mobile/pull/5575): [CONTENT] Add translations to SRP Reveal feature
- [#5559](https://github.com/MetaMask/metamask-mobile/pull/5559): [ANALYTICS] Add analytics events for SRP reveal

## 5.14.0 - Jan 27, 2023
- [#5631](https://github.com/MetaMask/metamask-mobile/pull/5631): [FIX] Modal confirmation refactoring
- [#5624](https://github.com/MetaMask/metamask-mobile/pull/5624): [FIX] Fix currency display
- [#5615](https://github.com/MetaMask/metamask-mobile/pull/5615): [FIX] Fix analytics events
- [#5585](https://github.com/MetaMask/metamask-mobile/pull/5585): [FIX] Token Detection not persisting
- [#5556](https://github.com/MetaMask/metamask-mobile/pull/5556): [FIX] Swaps disabled on fresh install on some networks
- [#5550](https://github.com/MetaMask/metamask-mobile/pull/5550): [FIX] On-ramp: Fix order link in details screen
- [#5535](https://github.com/MetaMask/metamask-mobile/pull/5535): [IMPROVEMENT] Add content for "Add friction to revealing SRP"
- [#5538](https://github.com/MetaMask/metamask-mobile/pull/5538): [FIX] E2e appium test failure fix
- [#5444](https://github.com/MetaMask/metamask-mobile/pull/5444): [FIX] Fix unecessary executions of useEffect
- [#5506](https://github.com/MetaMask/metamask-mobile/pull/5506): [IMPROVEMENT] On-ramp: Add NavBar tests to GetStarted and Regions Views
- [#5495](https://github.com/MetaMask/metamask-mobile/pull/5495): [IMPROVEMENT] Copy update for metamask fee on swaps
- [#5525](https://github.com/MetaMask/metamask-mobile/pull/5525): [IMPROVEMENT] On-ramp: add fiatOrders reducer tests
- [#5521](https://github.com/MetaMask/metamask-mobile/pull/5521): [IMPROVEMENT] On-ramp: Remove unused state and fix initial state
- [#5487](https://github.com/MetaMask/metamask-mobile/pull/5487): [IMPROVEMENT] On-ramp: Use themeAppearance
- [#5530](https://github.com/MetaMask/metamask-mobile/pull/5530): [IMPROVEMENT] Refactor RevealPrivateCredential View
- [#5526](https://github.com/MetaMask/metamask-mobile/pull/5526): [IMPROVEMENT] On-ramp: Add on-ramp utils tests
- [#5531](https://github.com/MetaMask/metamask-mobile/pull/5531): [IMPROVEMENT] Refactor SeedPhraseVideo to mount player after transition
- [#5522](https://github.com/MetaMask/metamask-mobile/pull/5522): [IMPROVEMENT] On-ramp: Remove scrollable prop from views and update snapshots
- [#5524](https://github.com/MetaMask/metamask-mobile/pull/5524): [IMPROVEMENT] On-ramp: Add order processor tests
- [#5512](https://github.com/MetaMask/metamask-mobile/pull/5512): [IMPROVEMENT] Remove redundant browser feature file
- [#5511](https://github.com/MetaMask/metamask-mobile/pull/5511): [IMPROVEMENT] On-ramp: Rename applePay hook to useApplePay
- [#5499](https://github.com/MetaMask/metamask-mobile/pull/5499): [FIX] Remove duplicate property
- [#5496](https://github.com/MetaMask/metamask-mobile/pull/5496): [REVERT] Onramp - Remove Text as any ocurrences
- [#5474](https://github.com/MetaMask/metamask-mobile/pull/5474): [IMPROVEMENT] Screenshot deterrent alert
- [#5489](https://github.com/MetaMask/metamask-mobile/pull/5489): [IMPROVEMENT] Renaming Step files to include ".steps"
- [#5460](https://github.com/MetaMask/metamask-mobile/pull/5460): [IMPROVEMENT] E2e test/browser flow
- [#5488](https://github.com/MetaMask/metamask-mobile/pull/5488): [IMPROVEMENT] Add Browserstack step to Bitrise
- [#5486](https://github.com/MetaMask/metamask-mobile/pull/5486): [FIX] Add providerValues to renderScreen
- [#5484](https://github.com/MetaMask/metamask-mobile/pull/5484): [IMPROVEMENT] Isolate e2e-Appium Feature scenarios
- [#5483](https://github.com/MetaMask/metamask-mobile/pull/5483): [IMPROVEMENT] Add renderScreen test util
- [#5476](https://github.com/MetaMask/metamask-mobile/pull/5476): [IMPROVEMENT] README.md: update "Install the Android NDK"
- [#5479](https://github.com/MetaMask/metamask-mobile/pull/5479): [IMPROVEMENT] Mount SeedPhraseVideo Video Player after transition
- [#5475](https://github.com/MetaMask/metamask-mobile/pull/5475): [FIX] Fix import of `isEIP1559Transaction`
- [#5473](https://github.com/MetaMask/metamask-mobile/pull/5473): [DEPENDENCIES] On-ramp: upgrade on-ramp-sdk to v1.6.1
- [#5465](https://github.com/MetaMask/metamask-mobile/pull/5465): [strings] vault corruption recovery strings
- [#5433](https://github.com/MetaMask/metamask-mobile/pull/5433): [IMPROVEMENT] Add WebdriverIO test reports and Browserstack Integration
- [#5270](https://github.com/MetaMask/metamask-mobile/pull/5270): [DEPENDENCIES] Migrate to new controller packages
- [#5449](https://github.com/MetaMask/metamask-mobile/pull/5449): [IMPROVEMENT] Remove deeplink warning for SDK and SDK as dependency
- [#5468](https://github.com/MetaMask/metamask-mobile/pull/5468): [FIX] Screenshot deterrent analytics
- [#5462](https://github.com/MetaMask/metamask-mobile/pull/5462): [IMPROVEMENT] On-ramp: Remove unused constants
- [#5413](https://github.com/MetaMask/metamask-mobile/pull/5413): [IMPROVEMENT] On-ramp: Refactor Regions view to componentization
- [#5440](https://github.com/MetaMask/metamask-mobile/pull/5440): [FIX] Approval error when insufficient balance
- [#5459](https://github.com/MetaMask/metamask-mobile/pull/5459): [IMPROVEMENT] Remove extra zero balance account potentially created from seeking ahead
- [#5454](https://github.com/MetaMask/metamask-mobile/pull/5454): [IMPROVEMENT] Refactor Analytics Events
- [#5453](https://github.com/MetaMask/metamask-mobile/pull/5453): [IMPROVEMENT] Use "ModalConfirmation" component for the QR Reader security alert
- [#5447](https://github.com/MetaMask/metamask-mobile/pull/5447): [IMPROVEMENT] Refactor "Screenshot Deterrent" for Android
- [#5436](https://github.com/MetaMask/metamask-mobile/pull/5436): [IMPROVEMENT] On-ramp: Refactor fiatOrders reducer to TypeScript
- [#5451](https://github.com/MetaMask/metamask-mobile/pull/5451): [IMPROVEMENT] Add translations to "Screenshot Deterrent" feature
- [#5428](https://github.com/MetaMask/metamask-mobile/pull/5428): [IMPROVEMENT] Add accessibilityRole button to StyledButton
- [#5437](https://github.com/MetaMask/metamask-mobile/pull/5437): [IMPROVEMENT] On-ramp: Move useSDKMethod to its own file
- [#5448](https://github.com/MetaMask/metamask-mobile/pull/5448): [IMPROVEMENT] Add translations to "Safe QR" feature
- [#5219](https://github.com/MetaMask/metamask-mobile/pull/5219): [FIX] Update selected network when delete network manually inserted
- [#5430](https://github.com/MetaMask/metamask-mobile/pull/5430): [IMPROVEMENT] Remove Text as any occurrences

## 5.13.0 - Jan 17, 2022
- [#5381](https://github.com/MetaMask/metamask-mobile/pull/5381): [UPDATE] Bumped contract-metadata to 2.1.0
- [#5424](https://github.com/MetaMask/metamask-mobile/pull/5424): [IMPROVEMENT] Add Screenshot Warning to ImportPrivateKey
- [#4670](https://github.com/MetaMask/metamask-mobile/pull/4670): [FEAT] Screenshot Warning
- [#5422](https://github.com/MetaMask/metamask-mobile/pull/5422): [UPDATE] Add custom network and Import custom token
- [#5376](https://github.com/MetaMask/metamask-mobile/pull/5376): [IMPROVEMENT] Include L1 fee in the Send flow and on the tx detail page for Optimism
- [#5351](https://github.com/MetaMask/metamask-mobile/pull/5351): [REMOVE] On-ramp: remove old on-ramp experience
- [#5352](https://github.com/MetaMask/metamask-mobile/pull/5352): [UPDATE] Bump decode-uri-component from 0.2.0 to 0.2.2
- [#5246](https://github.com/MetaMask/metamask-mobile/pull/5246): [UPDATE] Bump loader-utils from 1.4.0 to 1.4.2
- [#5191](https://github.com/MetaMask/metamask-mobile/pull/5191): [IMPROVEMENT] Support for ens on deeplink transactions
- [#5115](https://github.com/MetaMask/metamask-mobile/pull/5115): [FIX] cancelling transaction when user does not give dapp permission to transfer funds
- [#5400](https://github.com/MetaMask/metamask-mobile/pull/5400): [FIX] jest expect type
- [#4546](https://github.com/MetaMask/metamask-mobile/pull/4546): [IMPROVEMENT] Support downloading Apple Wallet passes on iOS
- [#5200](https://github.com/MetaMask/metamask-mobile/pull/5200): [UPDATE] Update Controllers to version 33.0.0
- [#5083](https://github.com/MetaMask/metamask-mobile/pull/5083): [IMPROVEMENT] Component: Custom Spending Cap

## 5.12.3 - Dec 16, 2022
- Hotfix version bump for iOS only release, no code changes

## 5.12.1 - Dec 6, 2022
- [#5366](https://github.com/MetaMask/metamask-mobile/pull/5366): [UPDATE] On-ramp Refactor wyre authentication URL approach
- [#5362](https://github.com/MetaMask/metamask-mobile/pull/5362): [UPDATE] Copy for Opt in metrics screen and enable custom mainnet RPC
- [#5360](https://github.com/MetaMask/metamask-mobile/pull/5360): [FIX] Onboarding wizard automatic update modal
- [#5307](https://github.com/MetaMask/metamask-mobile/pull/5307): [IMPROVEMENT] Remove RPC URL, Block Explorer URL, Network Name from metrics
- [#5355](https://github.com/MetaMask/metamask-mobile/pull/5355): [IMPROVEMENT] Sanitize privacy settings before sending to Sentry 

## 5.12.0 - Dec 5, 2022
- [#5335](https://github.com/MetaMask/metamask-mobile/pull/5335): [IMPROVEMENT] On-ramp: Add useRegions hook and fix availablePaymentMethods
- [#5337](https://github.com/MetaMask/metamask-mobile/pull/5337): [FIX] Send ERC-20 tokens on legacy networks
- [#5333](https://github.com/MetaMask/metamask-mobile/pull/5333): [IMPROVEMENT] Only fetch minimum versions if permissions enabled
- [#5331](https://github.com/MetaMask/metamask-mobile/pull/5331): [UPDATE] Bump @metamask/swaps-controller
- [#5169](https://github.com/MetaMask/metamask-mobile/pull/5169): [FIX] Miscalculation on toWei func when passing valid numbers in scientific notation
- [#5238](https://github.com/MetaMask/metamask-mobile/pull/5238): [IMPROVEMENT] Browser experience
- [#5318](https://github.com/MetaMask/metamask-mobile/pull/5318): [FIX] Estimated gas fee calculation on the transaction detail page
- [#5294](https://github.com/MetaMask/metamask-mobile/pull/5294): [IMPROVEMENT] On-ramp: allow amount formatting on android
- [#5292](https://github.com/MetaMask/metamask-mobile/pull/5292): [FIX] On-ramp: fix default payment method selection
- [#5103](https://github.com/MetaMask/metamask-mobile/pull/5103): [FIX] WalletConnect signed typed and eth sign throwing error back to the dapp
- [#5263](https://github.com/MetaMask/metamask-mobile/pull/5263): [UPDATE] Updates WebRTC and Socket.io client to the latest versions
- [#5273](https://github.com/MetaMask/metamask-mobile/pull/5273): [IMPROVEMENT] Enable new networks for Swaps
- [#5244](https://github.com/MetaMask/metamask-mobile/pull/5244): [UPDATE] Change SDK URL
- [#5262](https://github.com/MetaMask/metamask-mobile/pull/5262): [FIX] Fixes and configuration updates related to Branch.io Deep Links
- [#5289](https://github.com/MetaMask/metamask-mobile/pull/5289): [IMPROVEMENT] Add strings to feature "Screenshot Warning"
- [#5243](https://github.com/MetaMask/metamask-mobile/pull/5243): [FIX] Only trigger onLoadEnd when urls are equal
- [#5287](https://github.com/MetaMask/metamask-mobile/pull/5287): [IMPROVEMENT] Add translations to feature "Easy Delete Data"
- [#4917](https://github.com/MetaMask/metamask-mobile/pull/4917): [IMPROVEMENT] Trigger UpdateNeeded screen
- [#5280](https://github.com/MetaMask/metamask-mobile/pull/5280): [IMPROVEMENT] On-ramp: Add usePaymentMethods hook with customAction filter by chainId
- [#5265](https://github.com/MetaMask/metamask-mobile/pull/5265): [IMPROVEMENT] On-ramp: Add order pending description in details view
- [#5269](https://github.com/MetaMask/metamask-mobile/pull/5269): [FIX] On-Ramp: Fix 1.3.1 creating undefined custom order ids
- [#5267](https://github.com/MetaMask/metamask-mobile/pull/5267): [IMPROVEMENT] On-ramp: Change 0 amount to a pending state in order details
- [#5266](https://github.com/MetaMask/metamask-mobile/pull/5266): [REMOVE] On-ramp: Remove disabled button in amount to buy screen
- [#5268](https://github.com/MetaMask/metamask-mobile/pull/5268): [FIX] On-Ramp: Fix typos from payment method icon and contact support
- [#5220](https://github.com/MetaMask/metamask-mobile/pull/5220): [UPDATE] On-ramp-sdk@1.3.1: Wyre Apple Pay auth support and inAppBrowser hook
- [#5264](https://github.com/MetaMask/metamask-mobile/pull/5264): [FIX] Date msBetweenDates test
- [#5194](https://github.com/MetaMask/metamask-mobile/pull/5194): [FEATURE] Add more granular killswitches for swaps
- [#5237](https://github.com/MetaMask/metamask-mobile/pull/5237): [DEPENDENCIES] Update Segment dependencies

## 5.11.0 - Nov 21, 2022
- [#5088](https://github.com/MetaMask/metamask-mobile/pull/5088): [IMPROVEMENT] Add no payment methods screen
- [#5223](https://github.com/MetaMask/metamask-mobile/pull/5223): [IMPROVEMENT] Add payment method icons support
- [#5198](https://github.com/MetaMask/metamask-mobile/pull/5198): [IMPROVEMENT] Improve loading experience
- [#5213](https://github.com/MetaMask/metamask-mobile/pull/5213): [IMPROVEMENT] On-ramp: add payment method detail and disclaimer
- [#5214](https://github.com/MetaMask/metamask-mobile/pull/5214): [IMPROVEMENT] On-ramp: add payment method custom action analytics
- [#5188](https://github.com/MetaMask/metamask-mobile/pull/5188): [IMPROVEMENT] Networks-flow appium feature file

## 5.10.0 - Nov 10, 2022
- [#5209](https://github.com/MetaMask/metamask-mobile/pull/5209): [FIX] On-ramp: multiple redirection handling
- [#5217](https://github.com/MetaMask/metamask-mobile/pull/5217): [FIX] Send to the wrong address
- [#5202](https://github.com/MetaMask/metamask-mobile/pull/5202): [FEAT] On-Ramp: allow Harmony ONE
- [#5195](https://github.com/MetaMask/metamask-mobile/pull/5195): [FEAT] Onramp: Add exclude from purchases to onramp aggregator orders
- [#5064](https://github.com/MetaMask/metamask-mobile/pull/5064): [UPDATE] Refactor Approve Component
- [#5158](https://github.com/MetaMask/metamask-mobile/pull/5158): [FEAT] On-Ramp: Provider payment method custom action and custom order ids
- [#5119](https://github.com/MetaMask/metamask-mobile/pull/5119): [FIX] Crash when reject two times connect wallet on in app browser
- [#5173](https://github.com/MetaMask/metamask-mobile/pull/5173): [FIX] Android build cMake
- [#5167](https://github.com/MetaMask/metamask-mobile/pull/5167): [FIX] Fixed Button Base Size issue
- [#4868](https://github.com/MetaMask/metamask-mobile/pull/4868): [UPDATE] Refactor ApprovalTransaction Component
- [#5142](https://github.com/MetaMask/metamask-mobile/pull/5142): [FIX] Fix high severity audit issues
- [#4235](https://github.com/MetaMask/metamask-mobile/pull/4235): [FIX] Delete contact on android fixed
- [#5116](https://github.com/MetaMask/metamask-mobile/pull/5116): [FIX] Updated EditLegacy Component
- [#4835](https://github.com/MetaMask/metamask-mobile/pull/4835): [UPDATE] Refactor SendTransaction Component
- [#5113](https://github.com/MetaMask/metamask-mobile/pull/5113): [UPDATE] avoid using Rinkeby in wallet & import network test
- [#4922](https://github.com/MetaMask/metamask-mobile/pull/4922): [FEAT] Segment Integration
- [#5041](https://github.com/MetaMask/metamask-mobile/pull/5041): [FEAT] Add accordion component to Design System
- [#5091](https://github.com/MetaMask/metamask-mobile/pull/5091): [UPDATE] Standardized Storybook Structure
- [#4888](https://github.com/MetaMask/metamask-mobile/pull/4888): [FEAT] Extend popular network list
- [#5096](https://github.com/MetaMask/metamask-mobile/pull/5096): [UPDATE] Update audit list
- [#5067](https://github.com/MetaMask/metamask-mobile/pull/5067): [FEAT] Component: Contract Box component

## 5.9.1 - Oct 28, 2022
- [#5172](https://github.com/MetaMask/metamask-mobile/pull/5172): [FIX] ENS name being resolved correctly

## 5.9.0 - Oct 10, 2022
 - [#5035](https://github.com/MetaMask/metamask-mobile/pull/5035): [FIX] On-Ramp: Fix autolock dispatch for apple pay
 - [#4804](https://github.com/MetaMask/metamask-mobile/pull/4804): [UPDATE] GasPolling refactor UpdateEIP1559Transaction Component
 - [#5079](https://github.com/MetaMask/metamask-mobile/pull/5079): [FIX] Network switch during QR scan in Send Flow
 - [#5077](https://github.com/MetaMask/metamask-mobile/pull/5077): [FEATURE] translations for permission system
 - [#5044](https://github.com/MetaMask/metamask-mobile/pull/5044): [FIX] evaluating ‘transaction.status’
 - [#5040](https://github.com/MetaMask/metamask-mobile/pull/5040): [ADD] Component/4721-card
 - [#5034](https://github.com/MetaMask/metamask-mobile/pull/5034): [FIX] Wallet Connect PR#4934 and PR#4861
 - [#5065](https://github.com/MetaMask/metamask-mobile/pull/5065): [ENHANCEMENT] added shadows to useAppTheme
 - [#5039](https://github.com/MetaMask/metamask-mobile/pull/5039): [UPDATE]  update shadow tokens
 - [#5010](https://github.com/MetaMask/metamask-mobile/pull/5010): [ADD] InApp Browser package
 - [#5058](https://github.com/MetaMask/metamask-mobile/pull/5058): [UPDATE] patch vm2 via resolution
 - [#5042](https://github.com/MetaMask/metamask-mobile/pull/5042): [ADD] Component/4723-estimatedtext
 - [#4999](https://github.com/MetaMask/metamask-mobile/pull/4999): [ADD] Component: Account and balance component
 - [#5030](https://github.com/MetaMask/metamask-mobile/pull/5030): [ENHANCEMENT] PR template with working link for mobile coding standards
 - [#5033](https://github.com/MetaMask/metamask-mobile/pull/5033): [UPDATE] default iOS simulator
 - [#5028](https://github.com/MetaMask/metamask-mobile/pull/5028): [FIX] variable interpolation in build.sh
 - [#5031](https://github.com/MetaMask/metamask-mobile/pull/5031): [ENHANCEMENT] Deprecate snake case from feature flags
 - [#5025](https://github.com/MetaMask/metamask-mobile/pull/5025): [ENHANCEMENT] Remove all "Ooops" copies
 - [#4404](https://github.com/MetaMask/metamask-mobile/pull/4404): [FIX] Fixed ERC20 token transfer from Dapps
 - [#5024](https://github.com/MetaMask/metamask-mobile/pull/5024): [UPDATE] app name for release-to-store step
 - [#5006](https://github.com/MetaMask/metamask-mobile/pull/5006): [UPDATE] Bump @keystonehq/ur-decoder from 0.3.0 to 0.6.1

## 5.8.1 - Oct 5, 2022
- [#4286](https://github.com/MetaMask/metamask-mobile/pull/4286): [ENHANCEMENT] Integrates MetaMask SDK support

## 5.8.0 - Sept 22, 2022
- [#5018](https://github.com/MetaMask/metamask-mobile/pull/5018): [FIX] Vault corruption error log
- [#4972](https://github.com/MetaMask/metamask-mobile/pull/4972): [FIX] Unable to Speedup/Cancel legacy transactions
- [#4833](https://github.com/MetaMask/metamask-mobile/pull/4833): [ENHANCEMENT] Implement new QA builds for both Android and iOS
- [#4993](https://github.com/MetaMask/metamask-mobile/pull/4993): [ENHANCEMENT] On-Ramp: Add scrolling to payment methods and make logo property optional
- [#4997](https://github.com/MetaMask/metamask-mobile/pull/4997): [ENHANCEMENT] SRP Reveal Timestamp
- [#5002](https://github.com/MetaMask/metamask-mobile/pull/5002): [FEAT] ENS Wildcard and offchain resolution
- [#4430](https://github.com/MetaMask/metamask-mobile/pull/4430): [FIX] Keystone: Pagination and missing addresses
- [#3438](https://github.com/MetaMask/metamask-mobile/pull/3438): [DEPENDENCIES] Bump metro from 0.59.0 to 0.66.2
- [#4649](https://github.com/MetaMask/metamask-mobile/pull/4649): [ENHANCEMENT] Url redirection from QR code
- [#4980](https://github.com/MetaMask/metamask-mobile/pull/4980): [DEPENDENCIES] On-ramp: Add compact payment method selector
- [#4982](https://github.com/MetaMask/metamask-mobile/pull/4982): [FIX] typo in faucet name
- [#4983](https://github.com/MetaMask/metamask-mobile/pull/4983): [FIX] Navigation comment spell
- [#4755](https://github.com/MetaMask/metamask-mobile/pull/4755): [UPDATE] - New template fields added to reflect newer requirements for PRs
- [#4978](https://github.com/MetaMask/metamask-mobile/pull/4978): [ENHANCEMENT] Store distinct id for consistency
- [#4958](https://github.com/MetaMask/metamask-mobile/pull/4958): [FIX] WebView Origin Allowlist
- [#4941](https://github.com/MetaMask/metamask-mobile/pull/4941): [DEPENDENCIES] Replace "@react-native-community/async-storage" for "@react-native-async-storage/async-storage"
- [#4947](https://github.com/MetaMask/metamask-mobile/pull/4947): [IMPROVEMENT] WebView Error Copy
- [#4946](https://github.com/MetaMask/metamask-mobile/pull/4946): [ENHANCEMENT] Swaps: Add copy for 0% fee in quotes info modal
- [#4942](https://github.com/MetaMask/metamask-mobile/pull/4942): [ENHANCEMENT] Add unit tests to useDeleteWallet hook
- [#4939](https://github.com/MetaMask/metamask-mobile/pull/4939): [ENHANCEMENT] Update "Usability enhancement" template
- [#4938](https://github.com/MetaMask/metamask-mobile/pull/4938): [ENHANCEMENT] Bump git-clone version to 6 in Bitrise machines
- [#4782](https://github.com/MetaMask/metamask-mobile/pull/4782): [DEPENDENCIES] Detox version bump from 19.6.5 to 19.7.1

## 5.7.0 - Sept 21, 2022
- [#4905](https://github.com/MetaMask/metamask-mobile/pull/4905): [FIX] Update send flow
- [#4897](https://github.com/MetaMask/metamask-mobile/pull/4897): [IMPROVEMENT] Automatic security checks settings
- [#4902](https://github.com/MetaMask/metamask-mobile/pull/4902): [IMPROVEMENT] Deprecated networks Alert border fixed
- [#4885](https://github.com/MetaMask/metamask-mobile/pull/4885): [IMPROVEMENT] Implement warning for deprecated test networks, kovan, ropsten and rinkeby
- [#4898](https://github.com/MetaMask/metamask-mobile/pull/4898): [FIX] Test sanitizeUrlInput error
- [#4882](https://github.com/MetaMask/metamask-mobile/pull/4882): [FIX] Missing token detection event properties
- [#4869](https://github.com/MetaMask/metamask-mobile/pull/4869): [FIX] Remove decimals for on-ramp order details exchange rate
- [#4896](https://github.com/MetaMask/metamask-mobile/pull/4896): [DEPENDENCIES] Upgrade on-ramp-sdk to 1.2.0
- [#4860](https://github.com/MetaMask/metamask-mobile/pull/4860): [IMPROVEMENT] Change skip to payment method in on-ramp flow
- [#4892](https://github.com/MetaMask/metamask-mobile/pull/4892): [IMPROVEMENT] Increase polling cycles for on-ramp quotes to 6
- [#4407](https://github.com/MetaMask/metamask-mobile/pull/4407): [FIX] Add browser cookies support on Android
- [#4530](https://github.com/MetaMask/metamask-mobile/pull/4530): [IMPROVEMENT] Apply Test network prefix to token values to help educate users
- [#4841](https://github.com/MetaMask/metamask-mobile/pull/4841): [IMPROVEMENT] Component/4080 Badge
- [#4856](https://github.com/MetaMask/metamask-mobile/pull/4856): [IMPROVEMENT] Update Cell Account component
- [#4799](https://github.com/MetaMask/metamask-mobile/pull/4799): [FIX] Reveal SRP or Private Key wrong password error
- [#4305](https://github.com/MetaMask/metamask-mobile/pull/4305): [FEAT] Hide remember me
- [#4878](https://github.com/MetaMask/metamask-mobile/pull/4878): [FIX] Add testnets condition to blockchain explorer
- [#4862](https://github.com/MetaMask/metamask-mobile/pull/4862): [IMPROVEMENT] Fetch and parse app config
- [#4798](https://github.com/MetaMask/metamask-mobile/pull/4798): [ANALYTICS] Improve SRP reveal metrics
- [#4016](https://github.com/MetaMask/metamask-mobile/pull/4016): [FIX] ypo in conversion/index.js
- [#4503](https://github.com/MetaMask/metamask-mobile/pull/4503): [FIX] Jazz icons constantly changing
- [#4595](https://github.com/MetaMask/metamask-mobile/pull/4595): [DEPENDENCIES] Upgrade react-native-device-info to 9.0.2
- [#4684](https://github.com/MetaMask/metamask-mobile/pull/4684): [FIX] Account nickname is always defined
- [#4830](https://github.com/MetaMask/metamask-mobile/pull/4830): [FIX] Add user agent from property as default
- [#4828](https://github.com/MetaMask/metamask-mobile/pull/4828): [FIX] Image styling
- [#4839](https://github.com/MetaMask/metamask-mobile/pull/4839): [DEPENDENCIES] Introduce @testing-library/react-hooks dependency
- [#4748](https://github.com/MetaMask/metamask-mobile/pull/4748): [UPGRADE] Patch bump for SoLoader version on Android
- [#4824](https://github.com/MetaMask/metamask-mobile/pull/4824): [Fix] Fix password not being set as authentication type for login metrics
- [#4809](https://github.com/MetaMask/metamask-mobile/pull/4809): [IMPROVEMENT] Component/4779 Audit

## 5.6.1 - Sept 9, 2022
- [#4966](https://github.com/MetaMask/metamask-mobile/pull/4966): [FIX] Add http and https protocol to webview origin whitelist
- [#4967](https://github.com/MetaMask/metamask-mobile/pull/4967): [FIX] Correct url parse

## 5.6.0 - Aug 15, 2022
- [#4821](https://github.com/MetaMask/metamask-mobile/pull/4821): [FIX] Staging env redirection url for onramp
- [#4742](https://github.com/MetaMask/metamask-mobile/pull/4742): [ADD] On-Ramp generic error view event
- [#4743](https://github.com/MetaMask/metamask-mobile/pull/4743): [ADD] Payment Method logos
- [#4818](https://github.com/MetaMask/metamask-mobile/pull/4818): [ADD] Provider user agent to on-ramp Checkout WebView
- [#4640](https://github.com/MetaMask/metamask-mobile/pull/4640): [ADD] Confirmation modal component
- [#4749](https://github.com/MetaMask/metamask-mobile/pull/4749): [ADD] Current network to Fiat On-ramp titles
- [#4718](https://github.com/MetaMask/metamask-mobile/pull/4718): [ADD] Component/4226 bottom sheet
- [#4780](https://github.com/MetaMask/metamask-mobile/pull/4780): [FIX] Block explorer crash
- [#4740](https://github.com/MetaMask/metamask-mobile/pull/4740): [FIX] Duplicate property
- [#4793](https://github.com/MetaMask/metamask-mobile/pull/4793): [ADD] Dapp connect Warning
- [#4634](https://github.com/MetaMask/metamask-mobile/pull/4634): [IMPROVEMENT] safeNumberToBN Method
- [#4795](https://github.com/MetaMask/metamask-mobile/pull/4795): [UPDATE] urls updated
- [#4756](https://github.com/MetaMask/metamask-mobile/pull/4756): [PS] Componentize Cell #4083
- [#4784](https://github.com/MetaMask/metamask-mobile/pull/4784): [ADD] Hide Remember me strings
- [#4639](https://github.com/MetaMask/metamask-mobile/pull/4639): [FIX] Use default QR code colors
- [#4613](https://github.com/MetaMask/metamask-mobile/pull/4613): [ADD] Component/4079 avatar group
- [#4636](https://github.com/MetaMask/metamask-mobile/pull/4636): [FIX] NFT transfer with big token id

## 5.5.1 - Aug 16, 2022
- [UPDATE](https://github.com/MetaMask/dapps/pull/137): [UPDATE] Disable iOS explore links

## 5.5.0 - Jul 27, 2022
- [#4475](https://github.com/MetaMask/metamask-mobile/pull/4475): [IMPROVEMENT] Swaps support for hardware wallet
- [#4627](https://github.com/MetaMask/metamask-mobile/pull/4627): [IMPROVEMENT] Add typing support for payment methods to be used instead of payment IDs
- [#4625](https://github.com/MetaMask/metamask-mobile/pull/4625): [FIX] Handle SecureKeychain failed access while passcode enabled
- [#4655](https://github.com/MetaMask/metamask-mobile/pull/4655): [IMPROVEMENT] Add log for vault corruption
- [#4629](https://github.com/MetaMask/metamask-mobile/pull/4629): [IMPROVEMENT] Add EventEmitter for locale change events and update On-ramp SDK
- [#4685](https://github.com/MetaMask/metamask-mobile/pull/4685): [FIX] Fix `allowsInlineMediaPlayback` prop name
- [#4329](https://github.com/MetaMask/metamask-mobile/pull/4329): [IMPROVEMENT] Improve transaction activy for custom networks
- [#4643](https://github.com/MetaMask/metamask-mobile/pull/4643): [IMPROVEMENT] Add On-Ramp Aggregator a11y improvements
- [#4173](https://github.com/MetaMask/metamask-mobile/pull/4173): [FIX] Dapp domain resolver for ENS
- [#4676](https://github.com/MetaMask/metamask-mobile/pull/4676): [IMPROVEMENT] Componentize Toast
- [#4704](https://github.com/MetaMask/metamask-mobile/pull/4704): [IMPROVEMENT] Add word 'buy' to limit description
- [#4711](https://github.com/MetaMask/metamask-mobile/pull/4711): [FIX] Token Texts
- [#4677](https://github.com/MetaMask/metamask-mobile/pull/4677): [IMPROVEMENT] Network Picker component
- [#4689](https://github.com/MetaMask/metamask-mobile/pull/4689): [IMPROVEMENT] Componentize Account Picker
- [#4612](https://github.com/MetaMask/metamask-mobile/pull/4612): [IMPROVEMENT] Componentize Token Avatar

## 5.4.0 - Jul 12, 2022
- [#4604](https://github.com/MetaMask/metamask-mobile/pull/4604): [IMPROVEMENT] Change quotes error to individual events
- [#4497](https://github.com/MetaMask/metamask-mobile/pull/4497): [IMPROVEMENT] Add amount to onramp analytics events
- [#4496](https://github.com/MetaMask/metamask-mobile/pull/4496): [IMPROVEMENT] Add currency destination symbol to purchase submitted
- [#4498](https://github.com/MetaMask/metamask-mobile/pull/4498): [IMPROVEMENT] Add decimals optional prop to keypad in onramp amount view
- [#4600](https://github.com/MetaMask/metamask-mobile/pull/4600): [IMPROVEMENT] Add onramp extra properties to events
- [#4656](https://github.com/MetaMask/metamask-mobile/pull/4656): [FIX] Plain texts in code
- [#4388](https://github.com/MetaMask/metamask-mobile/pull/4388): [IMPROVEMENT] Introduce token detection v2
- [#4582](https://github.com/MetaMask/metamask-mobile/pull/4582): [IMPROVEMENT] Updated package name to be consistent with our npm namespace
- [#4609](https://github.com/MetaMask/metamask-mobile/pull/4609): [FEAT] Add pull to refresh and new design to Fiat Order Details view
- [#4527](https://github.com/MetaMask/metamask-mobile/pull/4527): [IMPROVEMENT] changed launch mode to singleInstance
- [#4644](https://github.com/MetaMask/metamask-mobile/pull/4644): [IMPROVEMENT] Update url formats popular networks
- [#4420](https://github.com/MetaMask/metamask-mobile/pull/4420): [IMPROVEMENT] Refactor transaction component
- [#4263](https://github.com/MetaMask/metamask-mobile/pull/4263): [FIX] Swaps approval transaction
- [#4618](https://github.com/MetaMask/metamask-mobile/pull/4618): [IMPROVEMENT] Componentize SelectableListItem
- [#4606](https://github.com/MetaMask/metamask-mobile/pull/4606): [IMPROVEMENT] Componentize multiselect list item
- [#4610](https://github.com/MetaMask/metamask-mobile/pull/4610): [FIX] Remove TouchableOpacity from DeleteMetaMetricsData component
- [#4554](https://github.com/MetaMask/metamask-mobile/pull/4554): [IMPROVEMENT] Allow for env variable to customise the simulator that gets launched on iOS
- [#4575](https://github.com/MetaMask/metamask-mobile/pull/4575): [IMPROVEMENT] Componentize tag url
- [#4572](https://github.com/MetaMask/metamask-mobile/pull/4572): [IMPROVEMENT] Componentize tag
- [#4549](https://github.com/MetaMask/metamask-mobile/pull/4549): [IMPROVEMENT] Componentize tab bar
- [#4599](https://github.com/MetaMask/metamask-mobile/pull/4599): [IMPROVEMENT] Componentize Checkbox
- [#4583](https://github.com/MetaMask/metamask-mobile/pull/4583): [IMPROVEMENT] Componentize icon button
- [#4548](https://github.com/MetaMask/metamask-mobile/pull/4548): [IMPROVEMENT] Componentize tab bar item
- [#4525](https://github.com/MetaMask/metamask-mobile/pull/4525): [IMPROVEMENT] Componentize button tertiary
- [#4524](https://github.com/MetaMask/metamask-mobile/pull/4524): [IMPROVEMENT] Componentize button secondary
- [#4523](https://github.com/MetaMask/metamask-mobile/pull/4523): [IMPROVEMENT] Componentize button primary
- [#4522](https://github.com/MetaMask/metamask-mobile/pull/4522): [IMPROVEMENT] Componentize buttons
- [#4602](https://github.com/MetaMask/metamask-mobile/pull/4602): [FIX] Fix color types
- [#4603](https://github.com/MetaMask/metamask-mobile/pull/4603): [FIX] Remove yarn audit exclusions
- [#4580](https://github.com/MetaMask/metamask-mobile/pull/4580): [IMPROVEMENT] Componentize NetworkAvatar
- [#4414](https://github.com/MetaMask/metamask-mobile/pull/4414): [IMPROVEMENT] Componentize FaviconAvatar
- [#4587](https://github.com/MetaMask/metamask-mobile/pull/4587): [FIX] Remove codecov
- [#4499](https://github.com/MetaMask/metamask-mobile/pull/4499): [IMPROVEMENT] Componentize icon
- [#4481](https://github.com/MetaMask/metamask-mobile/pull/4481): [IMPROVEMENT] Updating colors and typography to use theme objects
- [#4559](https://github.com/MetaMask/metamask-mobile/pull/4559): [FIX] Add resolution for shell-quote & got
- [#4531](https://github.com/MetaMask/metamask-mobile/pull/4531): [IMPROVEMENT] Add delete wallet step spec

## 5.3.0 - Jun 16, 2022
- [#4506](https://github.com/MetaMask/metamask-mobile/pull/4506): [IMPROVEMENT] Add OnRamp aggregator translations
- [#4389](https://github.com/MetaMask/metamask-mobile/pull/4389): [FEAT] Easy delete data
- [#4510](https://github.com/MetaMask/metamask-mobile/pull/4510): [IMPROVEMENT] Update RPC URL for xDai
- [#4269](https://github.com/MetaMask/metamask-mobile/pull/4269): [IMPROVEMENT] Show amount being approved by default on approval screens
- [#4495](https://github.com/MetaMask/metamask-mobile/pull/4495): [FIX] WalletConnect Icon on connect screen
- [#4505](https://github.com/MetaMask/metamask-mobile/pull/4505): [FIX] Updated new rpcUrl of gnosischain on test file
- [#4442](https://github.com/MetaMask/metamask-mobile/pull/4442): [FIX] Skip to amount to buy when region is selected
- [#4501](https://github.com/MetaMask/metamask-mobile/pull/4501): [FIX] Add accesible false to pressable group preventing VoiceOver interaction
- [#4247](https://github.com/MetaMask/metamask-mobile/pull/4247): [IMPROVEMENT] Add rounded corners to svg NFTs
- [#4470](https://github.com/MetaMask/metamask-mobile/pull/4470): [FIX] Add minimum required params to orders
- [#4469](https://github.com/MetaMask/metamask-mobile/pull/4469): [FIX] Displaying notification when state changes
- [#4443](https://github.com/MetaMask/metamask-mobile/pull/4443): [FIX] Wrong analytics property for region event
- [#4468](https://github.com/MetaMask/metamask-mobile/pull/4468): [FIX] Wrong amount out for onramp analytics
- [#4418](https://github.com/MetaMask/metamask-mobile/pull/4418): [IMPROVEMENT] Import address verification in send flow
- [#3783](https://github.com/MetaMask/metamask-mobile/pull/3783): [FEAT] Add custom networks
- [#4131](https://github.com/MetaMask/metamask-mobile/pull/4131): [FIX] Add method for crypto that are not in ISO4217
- [#4187](https://github.com/MetaMask/metamask-mobile/pull/4187): [IMPROVEMENT] Update copy in Edit & Advance Screens
- [#4060](https://github.com/MetaMask/metamask-mobile/pull/4060): [FIX] Avoid canceling transactions after submission
- [#4478](https://github.com/MetaMask/metamask-mobile/pull/4478): [IMPROVEMENT] Video subtitles
- [#4429](https://github.com/MetaMask/metamask-mobile/pull/4429): [FIX] Prompt camera permission
- [#4440](https://github.com/MetaMask/metamask-mobile/pull/4440): [FIX] Updating instances of "Metamask" to "MetaMask"
- [#4438](https://github.com/MetaMask/metamask-mobile/pull/4438): [FIX] Resolved spelling mistake
- [#4445](https://github.com/MetaMask/metamask-mobile/pull/4445): [FIX] Adding resolutions for security critical packages
- [#3943](https://github.com/MetaMask/metamask-mobile/pull/3943): [FIX] Remove old gas estimation
- [#4070](https://github.com/MetaMask/metamask-mobile/pull/4070): [IMPROVEMENT] Update SelectQRAccounts UI
- [#4178](https://github.com/MetaMask/metamask-mobile/pull/4178): [FIX] Prevent crash when funds warning is pressed
- [#4367](https://github.com/MetaMask/metamask-mobile/pull/4367): [IMPROVEMENT] Make text hex data selectable

## 5.2.0 - May 17, 2022
- [#4349](https://github.com/MetaMask/metamask-mobile/pull/4349): [FIX] Subtitle mapping
- [#4344](https://github.com/MetaMask/metamask-mobile/pull/4344): [FIX] Fix homepage scripts and env import
- [#4345](https://github.com/MetaMask/metamask-mobile/pull/4345): [FIX] Fix check for empty tokens list
- [#3696](https://github.com/MetaMask/metamask-mobile/pull/3696): [FEATURE] Fiat on Ramp Aggregator
- [#4303](https://github.com/MetaMask/metamask-mobile/pull/4303): [IMPROVEMENT] Add support for env variable for MM_HOMEPAGE
- [#4331](https://github.com/MetaMask/metamask-mobile/pull/4331): [IMPROVEMENT] Fix addressbook and browser test
- [#4170](https://github.com/MetaMask/metamask-mobile/pull/4170): [FIX] Copy to clipboard for Android version 9 and below
- [#4328](https://github.com/MetaMask/metamask-mobile/pull/4328): [FIX] Fix generate-static-assets
- [#4318](https://github.com/MetaMask/metamask-mobile/pull/4318): [FIX] Fix confusables bug
- [#4316](https://github.com/MetaMask/metamask-mobile/pull/4316): [IMPROVEMENT] GIVEN, WHEN, THEN - Template Update
- [#4167](https://github.com/MetaMask/metamask-mobile/pull/4167): [IMPROVEMENT] Adds support for 'dapp/' urls support on 'metamask://' and fixes DL opening to Apple Store
- [#4175](https://github.com/MetaMask/metamask-mobile/pull/4175): [Fix] Favourites not showing when home button is pressed in browser tab menu
- [#4278](https://github.com/MetaMask/metamask-mobile/pull/4278): [IMPROVEMENT] Convert back to spaces
- [#4249](https://github.com/MetaMask/metamask-mobile/pull/4249): [IMPROVEMENT] patch cross-fetch instead of skipping
- [#4174](https://github.com/MetaMask/metamask-mobile/pull/4174): [IMPROVEMENT] Address now is in the checksum standard format
- [#4182](https://github.com/MetaMask/metamask-mobile/pull/4182): [IMPROVEMENT] Standardize prettier configuration
- [#4183](https://github.com/MetaMask/metamask-mobile/pull/4183): [FIX] excluded audit because no available patch

## 5.1.0 - May 5, 2022
- [#3929](https://github.com/MetaMask/metamask-mobile/pull/3929): [IMPROVEMENT] Defaults to current network if chain id not specified in QR codes
- [#4159](https://github.com/MetaMask/metamask-mobile/pull/4159): [IMPROVEMENT] - iCloud Backup Restriction
- [#4035](https://github.com/MetaMask/metamask-mobile/pull/4035): [FIX] Issue #207
- [#4129](https://github.com/MetaMask/metamask-mobile/pull/4129): [IMPROVEMENT] Add e2e coverage for invalid browser url & changing password
- [#4166](https://github.com/MetaMask/metamask-mobile/pull/4166): [FIX] Undefined address error
- [#4165](https://github.com/MetaMask/metamask-mobile/pull/4165): [ANALYTICS] Add events to "Hold to Reveal Private Credential" feature
- [#4099](https://github.com/MetaMask/metamask-mobile/pull/4099): [IMPROVEMENT] Metrics only enabled when confirm button is pressed
- [#4168](https://github.com/MetaMask/metamask-mobile/pull/4168): [FIX] Fixed wallet_watchAsset API
- [#4114](https://github.com/MetaMask/metamask-mobile/pull/4114): [FEAT] Add the "Hold to Reveal" button before revealing an account’s private key
- [#4151](https://github.com/MetaMask/metamask-mobile/pull/4151): [FIX] Revert credit card support
- [#3942](https://github.com/MetaMask/metamask-mobile/pull/3942): [FIX] Add custom token
- [#4089](https://github.com/MetaMask/metamask-mobile/pull/4089): [FIX] Fix/2830 enter many names
- [#4115](https://github.com/MetaMask/metamask-mobile/pull/4115): [IMPROVEMENT] Upgrade controllers to 28.0.0
- [#4090](https://github.com/MetaMask/metamask-mobile/pull/4090): [FIX] Fix can not scroll on dapp modal
- [#4113](https://github.com/MetaMask/metamask-mobile/pull/4113): [FIX] Add ticker to SelectQRAccounts
- [#3980](https://github.com/MetaMask/metamask-mobile/pull/3980): [FIX] Patch network specific asset modal (Token detection)
- [#4154](https://github.com/MetaMask/metamask-mobile/pull/4154): [FIX] Update react-native-webview+11.13.0.patch
- [#4135](https://github.com/MetaMask/metamask-mobile/pull/4135): [IMPROVEMENT]browser improvement 

## 5.0.1 - April 20, 2022
- [FIX] iOS Hotfix - Add LinkPresentation library

## 5.0.0 - April 13, 2022
- [#3971](https://github.com/MetaMask/metamask-mobile/pull/3971): [FIX] Fix issues releated to deep/universal links
- [#3925](https://github.com/MetaMask/metamask-mobile/pull/3925): [FEAT] Allow ApplePay in Transak webview.
- [#4047](https://github.com/MetaMask/metamask-mobile/pull/4047): [FIX] Fix attribution url
- [#3972](https://github.com/MetaMask/metamask-mobile/pull/3972): [FIX] Fix GasEducation ticker
- [#3915](https://github.com/MetaMask/metamask-mobile/pull/3915): [FEAT] Keystone integration
- [#4033](https://github.com/MetaMask/metamask-mobile/pull/4033): [FIX] Remove hardcoded fill
- [#3979](https://github.com/MetaMask/metamask-mobile/pull/3979): [FIX] TransactionDetails speed up and cancel CTA
- [#3948](https://github.com/MetaMask/metamask-mobile/pull/3948): [FIX] Update button on WebviewError

## v4.4.0 - March 28, 2022
- [#3910](https://github.com/MetaMask/metamask-mobile/pull/3910): [IMPROVEMENT] Network Specific Asset Education
- [#3877](https://github.com/MetaMask/metamask-mobile/pull/3877): [IMPROVEMENT] Add OSS attribution
- [#3731](https://github.com/MetaMask/metamask-mobile/pull/3731): [FIX] Fix formatting of gas price for all conversion currencies
- [#3846](https://github.com/MetaMask/metamask-mobile/pull/3846): [FEATURE] Add MoonPay on-ramp support. Add CUSD and CEUR support for Transak
- [#3792](https://github.com/MetaMask/metamask-mobile/pull/3792): [FIX] Self sent token transactions
- [#3902](https://github.com/MetaMask/metamask-mobile/pull/3902): [IMPROVEMENT] Add better messaging around ENS validation
- [#3969](https://github.com/MetaMask/metamask-mobile/pull/3969): [FIX] Fix typo in network modal

## v4.3.1 - March 23, 2022
- [#3946](https://github.com/MetaMask/metamask-mobile/pull/3946): [FIX] Fix error boundary SRP
- [#3947](https://github.com/MetaMask/metamask-mobile/pull/3947): [FIX] Fix gas carousel price estimate
- [#3940](https://github.com/MetaMask/metamask-mobile/pull/3940): [FIX] Fix browser crash

## v4.3.0 - March 16, 2022
- [#3916](https://github.com/MetaMask/metamask-mobile/pull/3916): [FIX] Patch Android clipboard crasher
- [#3776](https://github.com/MetaMask/metamask-mobile/pull/3776): [IMPROVEMENT] Enable dark mode
- [#3899](https://github.com/MetaMask/metamask-mobile/pull/3899): [IMPROVEMENT] Improve WalletConnect checks
- [#3898](https://github.com/MetaMask/metamask-mobile/pull/3898): [FIX] Exclude deps in build.gradle (Fix Android build)
- [#3900](https://github.com/MetaMask/metamask-mobile/pull/3900): [IMPROVEMENT] Safe delete copied object instead of original one
- [#3703](https://github.com/MetaMask/metamask-mobile/pull/3703): [IMPROVEMENT] Add credit card support and change copy
- [#3892](https://github.com/MetaMask/metamask-mobile/pull/3892): [FIX] Fix undefined gas price crash
- [#3850](https://github.com/MetaMask/metamask-mobile/pull/3850): [FIX] Fix 'io.branch.referral.installListener' crashes on Android
- [#3888](https://github.com/MetaMask/metamask-mobile/pull/3888): [FIX] Fix go to ens domain when coming from qr code
- [#3692](https://github.com/MetaMask/metamask-mobile/pull/3692): [IMPROVEMENT] Show the contract receiving token allowances on the allowance screen
- [#3878](https://github.com/MetaMask/metamask-mobile/pull/3878): [IMPROVEMENT] Upgrade controllers v26.0.0 and Swaps controller to v6.6.0
- [#3756](https://github.com/MetaMask/metamask-mobile/pull/3756): [FIX] Prioritise specified transaction gas to allow gasless network transactions
- [#3863](https://github.com/MetaMask/metamask-mobile/pull/3863): [FIX] Fix spend limit bug
- [#3851](https://github.com/MetaMask/metamask-mobile/pull/3851): [IMPROVEMENT] Clear browser tabs when cleaning history
- [#3790](https://github.com/MetaMask/metamask-mobile/pull/3790): [FIX] "Speed up" and "Cancel" buttons showing up in the receiver side
- [#3819](https://github.com/MetaMask/metamask-mobile/pull/3819): [FIX] The recent list doesn’t convert addresses to my nickname
- [#3802](https://github.com/MetaMask/metamask-mobile/pull/3802): [FIX] Check that network exists when adding a custom network
- [#3837](https://github.com/MetaMask/metamask-mobile/pull/3837): [FIX] Fix onramp BUSD address
- [#3824](https://github.com/MetaMask/metamask-mobile/pull/3824): [FIX] Add tokens/NFTs button triggers multiple times
- [#3803](https://github.com/MetaMask/metamask-mobile/pull/3803): [FIX] Fix gas fee on education wizard and related JSON parse error
- [#3825](https://github.com/MetaMask/metamask-mobile/pull/3825): [FIX] Fix lack of full ENS namespace support
- [#3638](https://github.com/MetaMask/metamask-mobile/pull/3638): [IMPROVEMENT] Upgrade controllers to 25.1.0

## v4.2.2 - February 24, 2022
- [#3841](https://github.com/MetaMask/metamask-mobile/pull/3841): [FIX] Fix custom network icons on Wallet Overview
- [#3839](https://github.com/MetaMask/metamask-mobile/pull/3839): [FIX] Update en.json
- [#3838](https://github.com/MetaMask/metamask-mobile/pull/3838): [FIX] Fix onramp BUSD address. Add wc_description string
- [#3811](https://github.com/MetaMask/metamask-mobile/pull/3811): [FIX] Problem when loading unknown icons on Swap token list
- [#3791](https://github.com/MetaMask/metamask-mobile/pull/3791): [FIX] Update style of ErrorMessage
- [#3797](https://github.com/MetaMask/metamask-mobile/pull/3797): [ENHANCEMENT] Add Fantom FTM and Celo CELO — Add token after fiat on ramp order
- [#3685](https://github.com/MetaMask/metamask-mobile/pull/3685): [ENHANCEMENT] WalletConnect, Deeplink and RPC methods refactors
- [#3766](https://github.com/MetaMask/metamask-mobile/pull/3766): [ENHANCEMENT] Swaps: Add Avalanche
- [#3806](https://github.com/MetaMask/metamask-mobile/pull/3806): [FIX] Custom network token crash
- [#3547](https://github.com/MetaMask/metamask-mobile/pull/3547): [IMPROVEMENT] Warn when exporting SRP
- [#3788](https://github.com/MetaMask/metamask-mobile/pull/3788): [UPGRADE] Bump url-parse from 1.5.2 to 1.5.9
- [#3764](https://github.com/MetaMask/metamask-mobile/pull/3764): [UPGRADE] Bump vm2 from 3.9.5 to 3.9.8
- [#3787](https://github.com/MetaMask/metamask-mobile/pull/3787): [FIX] Default spent limit value
- [#3774](https://github.com/MetaMask/metamask-mobile/pull/3774): [FIX] Address book e2e
- [#3770](https://github.com/MetaMask/metamask-mobile/pull/3770): [FIX] Delete wallet e2e
- [#3767](https://github.com/MetaMask/metamask-mobile/pull/3767): [FIX] Edit contact e2e
- [#3762](https://github.com/MetaMask/metamask-mobile/pull/3762): [ENHANCEMENT] Enhance auto-detection warning
- [#3618](https://github.com/MetaMask/metamask-mobile/pull/3618): [FIX] Modal view when adding wallet address to address book
- [#3724](https://github.com/MetaMask/metamask-mobile/pull/3724): [ENHANCEMENT] Update texts to use lock/unlock terminology
- [#3701](https://github.com/MetaMask/metamask-mobile/pull/3701): [FIX] Make selected option comes first in picker component on Android
- [#3752](https://github.com/MetaMask/metamask-mobile/pull/3752): [FIX] Fix OpenSea typo
- [#3548](https://github.com/MetaMask/metamask-mobile/pull/3548): [FIX] Fixes text field frame got cut off
- [#3690](https://github.com/MetaMask/metamask-mobile/pull/3690): [FIX] Revert svg crash

## v4.1.1 - February 23, 2022
- [3810](https://github.com/MetaMask/metamask-mobile/pull/3810) [FIX] Avalanche token crash

## v4.1.0 - February 9, 2022
- [#3741](https://github.com/MetaMask/metamask-mobile/pull/3741): [FIX] Potential error message from missing transactions details
- [#3738](https://github.com/MetaMask/metamask-mobile/pull/3738): [FIX] Error message for missing chain ID in deeplink
- [#3725](https://github.com/MetaMask/metamask-mobile/pull/3725): [FIX] Login decrypt bug
- [#3721](https://github.com/MetaMask/metamask-mobile/pull/3721): [FIX] Fixes deeplinks on Android 12 and other deeplinks minor fixes
- [#3691](https://github.com/MetaMask/metamask-mobile/pull/3691): [FIX] Limited number of lines for network names
- [#3650](https://github.com/MetaMask/metamask-mobile/pull/3650): [IMPROVEMENT] Handle network changes for incoming deeplink and qr code requests.
- [#3607](https://github.com/MetaMask/metamask-mobile/pull/3607): [FEATURE] Allow BSC, Polygon, Avalanche native and stable coins for on-ramp
- [#3573](https://github.com/MetaMask/metamask-mobile/pull/3573): [IMPROVEMENT] Code optimization, extract common code hooks usePrevious
- [#3593](https://github.com/MetaMask/metamask-mobile/pull/3593): [FIX] Line height is distributed unevenly when lineHeight <= fontSize
- [#3599](https://github.com/MetaMask/metamask-mobile/pull/3599): [FIX] Fix the input aligning on edit contact
- [#3562](https://github.com/MetaMask/metamask-mobile/pull/3562): [FIX] Removed sync with extension option in the settings view
- [#3664](https://github.com/MetaMask/metamask-mobile/pull/3664): [IMPROVEMENT] Scheme update for internal browser
- [#3558](https://github.com/MetaMask/metamask-mobile/pull/3558): [FIX] Fixes touch area of a close button and aligned the button
- [#3553](https://github.com/MetaMask/metamask-mobile/pull/3553): [FIX] Potential fix 'navigation.navigate' is undefined crashes reported on Sentry
- [#3538](https://github.com/MetaMask/metamask-mobile/pull/3538): [FIX] Fixes renderFromGwei related crashes
- [#3480](https://github.com/MetaMask/metamask-mobile/pull/3480): [IMPROVEMENT] Updated copy for drawer items to match extension
- [#3682](https://github.com/MetaMask/metamask-mobile/pull/3682): [IMPROVEMENT] Add ListItem storybook story
- [#3181](https://github.com/MetaMask/metamask-mobile/pull/3181): [IMPROVEMENT] Add client id to GasFeeController
- [#3461](https://github.com/MetaMask/metamask-mobile/pull/3461): [IMPROVEMENT] Clear the clipboard after the seed phrase is pasted
- [#3516](https://github.com/MetaMask/metamask-mobile/pull/3516): [IMPROVEMENT] Update App icons
- [#3676](https://github.com/MetaMask/metamask-mobile/pull/3676): [IMPROVEMENT] Documentation/webview debug instructions
- [#3374](https://github.com/MetaMask/metamask-mobile/pull/3374): [IMPROVEMENT] Storybook install, stories and guidelines
- [#3672](https://github.com/MetaMask/metamask-mobile/pull/3672): [IMPROVEMENT] Bump simple-get from 2.8.1 to 4.0.1

## v4.0.1 - January 31, 2022
- [#3658](https://github.com/MetaMask/metamask-mobile/pull/3658): [HOTFIX] 4.0.1 - BN crash and NFT Improvement

## v4.0.0 - January 20, 2022
- [#3509](https://github.com/MetaMask/metamask-mobile/pull/3509): [IMPROVEMENT] Upgrade to React Native 0.66.3
- [#3623](https://github.com/MetaMask/metamask-mobile/pull/3623): [FIX] Fix swaps slider button re-rendering
- [#3481](https://github.com/MetaMask/metamask-mobile/pull/3481): [FIX] Fix confirm button disabled on txn confirmation
- [#3495](https://github.com/MetaMask/metamask-mobile/pull/3495): [IMPROVEMENT] Reduce png file image weight using TinyPng cli tool

## v3.8.0 - December 3 2021
- [#3457](https://github.com/MetaMask/metamask-mobile/pull/3457): [FEAT] User review prompt
- [#3465](https://github.com/MetaMask/metamask-mobile/pull/3465): [FIX] 3464 fix login bug
- [#3430](https://github.com/MetaMask/metamask-mobile/pull/3430): [IMPROVEMENT] Add better initial state for swaps loading tokens
- [#3387](https://github.com/MetaMask/metamask-mobile/pull/3387): [FIX] Minor NFTs bugs
- [#3458](https://github.com/MetaMask/metamask-mobile/pull/3458): [FIX] Collectibles Autodetection
- [#3459](https://github.com/MetaMask/metamask-mobile/pull/3459): [FIX] Android Keyboard Text Entry
- [#3452](https://github.com/MetaMask/metamask-mobile/pull/3452): [FIX] `this.existingTxId` always false
- [#3423](https://github.com/MetaMask/metamask-mobile/pull/3423): [IMPROVEMENT] Android APK Size, App Load Time
- [#3443](https://github.com/MetaMask/metamask-mobile/pull/3443): [UPDATE] Disable Sync with Extension

## v3.7.0 - November 16 2021
- [#3405](https://github.com/MetaMask/metamask-mobile/pull/3405): [FIX] Remove Metric Opt In event
- [#3412](https://github.com/MetaMask/metamask-mobile/pull/3412): [UPGRADE] Android SDK and dependencies to support SDK 30
- [#3371](https://github.com/MetaMask/metamask-mobile/pull/3371): [FIX] iOS FaceID Deny Handler
- [#3346](https://github.com/MetaMask/metamask-mobile/pull/3346): [FEATURE] Mobile Vault Decryptor Functionality
- [#3397](https://github.com/MetaMask/metamask-mobile/pull/3397): [IMPROVEMENT] Enable sentry performance
- [#3394](https://github.com/MetaMask/metamask-mobile/pull/3394): [FIX] Persistence of analytics preference
- [#3350](https://github.com/MetaMask/metamask-mobile/pull/3350): [FEATURE] WalletConnect support signTypedData_v4 and use signTypedData_v3 by default
- [#3144](https://github.com/MetaMask/metamask-mobile/pull/3144): [IMPROVEMENT] use empty string quotes for anonymous id
- [#3413](https://github.com/MetaMask/metamask-mobile/pull/3413): [FIX] Pin git dependencies to SHA to be safe
- [#3392](https://github.com/MetaMask/metamask-mobile/pull/3392): [FIX] Allow sharp
- [#3367](https://github.com/MetaMask/metamask-mobile/pull/3367): [FEATURE] Add LavaMoat Allow-Scripts
- [#3378](https://github.com/MetaMask/metamask-mobile/pull/3378): [FIX] patch validator via resolution
- [#3357](https://github.com/MetaMask/metamask-mobile/pull/3357): [FIX] 404 dead links in readme

## v3.6.0 - November 1 2021
- [#3301](https://github.com/MetaMask/metamask-mobile/pull/3301): [FEATURE] ERC-1155 and custom network support
- [#3343](https://github.com/MetaMask/metamask-mobile/pull/3343): [IMPROVEMENT] Add IPFS support for NFTs
- [#3352](https://github.com/MetaMask/metamask-mobile/pull/3352): [FIX] Fix rendering issue when viewing data on transaction review screen
- [#3348](https://github.com/MetaMask/metamask-mobile/pull/3348): [IMPROVEMENT] Add webview deeplink support for Android
- [#3290](https://github.com/MetaMask/metamask-mobile/pull/3290): [FIX] Fix lost data when using wallet connect for ERC20 token transaction

## v3.5.0 - October 26 2021
- [#3340](https://github.com/MetaMask/metamask-mobile/pull/3340): [IMPROVEMENT] Reduce persisted data
- [#3330](https://github.com/MetaMask/metamask-mobile/pull/3330): [IMPROVEMENT] Refactor EngineService
- [#3325](https://github.com/MetaMask/metamask-mobile/pull/3325): [IMPROVEMENT] Isolate persisted data
- [#3314](https://github.com/MetaMask/metamask-mobile/pull/3314): [IMPROVEMENT] Update copy for token ID in collectible transaction
- [#3319](https://github.com/MetaMask/metamask-mobile/pull/3319): [IMPROVEMENT] Analytics - Track "Account Switcher" events
- [#3297](https://github.com/MetaMask/metamask-mobile/pull/3297): [IMPROVEMENT] Add IPFS support for tokens
- [#3298](https://github.com/MetaMask/metamask-mobile/pull/3298): [FEATURE] Move CI to GitHub Actions
- [#3302](https://github.com/MetaMask/metamask-mobile/pull/3302): [REFACTOR] Refactor AddCustomCollectible component
- [#3292](https://github.com/MetaMask/metamask-mobile/pull/3292): [FEATURE] Add analytics for android keystore
- [#3295](https://github.com/MetaMask/metamask-mobile/pull/3295): [FIX] Fix approval transaction getting mistakenly treated as a swap transaction
- [#3265](https://github.com/MetaMask/metamask-mobile/pull/3265): [FIX] Populate block number
- [#3294](https://github.com/MetaMask/metamask-mobile/pull/3294): [FIX] Fix empty text input on Android
- [#3293](https://github.com/MetaMask/metamask-mobile/pull/3293): [FIX] Fix Detox assertion test
- [#3255](https://github.com/MetaMask/metamask-mobile/pull/3255): [IMPROVEMENT] Detox Page Object Model
- [#3272](https://github.com/MetaMask/metamask-mobile/pull/3272): [IMPROVEMENT] Update recommended node.js version
- [#3271](https://github.com/MetaMask/metamask-mobile/pull/3271): [FIX] Update React Native dependecy links in README.md

## v3.4.1 - October 5 2021
- [#3260](https://github.com/MetaMask/metamask-mobile/pull/3260): [FIX] Turn off token detection by default
- [#3261](https://github.com/MetaMask/metamask-mobile/pull/3261): [FIX] Fix blank screen on fresh start
- [#3254](https://github.com/MetaMask/metamask-mobile/pull/3254): [IMPROVEMENT] Isolate LICENSE file
- [#3251](https://github.com/MetaMask/metamask-mobile/pull/3251): [IMPROVEMENT] Enable CLA signing
- [#3146](https://github.com/MetaMask/metamask-mobile/pull/3146): [IMPROVEMENT] Stabilizing Detox Tests
- [#3247](https://github.com/MetaMask/metamask-mobile/pull/3247): [IMPROVEMENT] Add timeout to redux-persist
- [#3243](https://github.com/MetaMask/metamask-mobile/pull/3243): [FIX] Fix decode transfer data
- [#3221](https://github.com/MetaMask/metamask-mobile/pull/3221): [IMPROVEMENT] Replacing swaps source image to include new 1inch logo.
- [#3203](https://github.com/MetaMask/metamask-mobile/pull/3203): [FIX] Disable confirm button when transaction is submitted
- [#3211](https://github.com/MetaMask/metamask-mobile/pull/3211): [FIX] Reflect network change on Browser
- [#3207](https://github.com/MetaMask/metamask-mobile/pull/3207): [FIX] Fix rendering SVGs on Android release mode
- [#3210](https://github.com/MetaMask/metamask-mobile/pull/3210): [IMPROVEMENT] Avoid destructuring error when checking swaps liveness
- [#3173](https://github.com/MetaMask/metamask-mobile/pull/3173): [FIX] Lock contract metadata version to v1.30.0
- [#3106](https://github.com/MetaMask/metamask-mobile/pull/3106): [FEATURE] Enable variables for speed up and cancel transactions
- [#3155](https://github.com/MetaMask/metamask-mobile/pull/3155): [IMPROVEMENT] Improve transaction state management for custom networks
- [#3164](https://github.com/MetaMask/metamask-mobile/pull/3164): [FIX] Support Apple Pay on iOS 15
- [#3152](https://github.com/MetaMask/metamask-mobile/pull/3152): [FIX] Fix remove token crasher
- [#3133](https://github.com/MetaMask/metamask-mobile/pull/3133): [FIX] Fix reload when switching networks on the browser
- [#3130](https://github.com/MetaMask/metamask-mobile/pull/3130): [IMPROVEMENT] Re-add opt in event
- [#3131](https://github.com/MetaMask/metamask-mobile/pull/3131): [IMPROVEMENT] Add missing browser event
- [#3153](https://github.com/MetaMask/metamask-mobile/pull/3153): [FIX] Fix inject favourites homepage
- [#3129](https://github.com/MetaMask/metamask-mobile/pull/3129): [FIX] Parse transaction data correctly
- [#2901](https://github.com/MetaMask/metamask-mobile/pull/2901): [FEATURE] Auto token detection on ethereum mainnet
- [#2994](https://github.com/MetaMask/metamask-mobile/pull/2994): [IMPROVEMENT] Analytics: Add Wallet Security and moving opt-in first in the flow
- [#3121](https://github.com/MetaMask/metamask-mobile/pull/3121): [FIX] Analytics + Icon fixes
- [#3117](https://github.com/MetaMask/metamask-mobile/pull/3117): [FIX] Moved the newTab method to the componentdidmount
- [#3115](https://github.com/MetaMask/metamask-mobile/pull/3115): [IMPROVEMENT] Update README.md

## v3.3.0 - September 9 2021
- [#3099](https://github.com/MetaMask/metamask-mobile/pull/3099): [FEATURE] Transaction state improvement
- [UPGRADE] react-native-webview 11.0.2 -> 11.13.0
- [#3101](https://github.com/MetaMask/metamask-mobile/pull/3101): [UPDATE] update swaps-controller and send clientId on fetchSwapsFeatureLiveness
- [#2977](https://github.com/MetaMask/metamask-mobile/pull/2977): [FIX] Fix undefined values in CustomGas component
- [#3104](https://github.com/MetaMask/metamask-mobile/pull/3104): [FEATURE] Add browser analytics
- [#3066](https://github.com/MetaMask/metamask-mobile/pull/3066): [UPGRADE] Redux and tests
- [#2866](https://github.com/MetaMask/metamask-mobile/pull/2866): [FIX] Bug in token balance
- [#3100](https://github.com/MetaMask/metamask-mobile/pull/3100): [FIX] Catch undefined navigate on buy eth
- [#3088](https://github.com/MetaMask/metamask-mobile/pull/3088): [UPDATE] Add typescript eslint from metamask
- [#3084](https://github.com/MetaMask/metamask-mobile/pull/3084): [UPGRADE] Bump eth-url-parser from 1.0.2 to 1.0.4
- [#2852](https://github.com/MetaMask/metamask-mobile/pull/2852): [UPDATE] Feature/improve warning eth sign
- [#3023](https://github.com/MetaMask/metamask-mobile/pull/3023): [FEATURE] Add support for wallet_switchEthereumChain
- [#3068](https://github.com/MetaMask/metamask-mobile/pull/3068): [UPGRADE] Bump @react-navigation/compat from 5.3.15 to 5.3.20
- [#3080](https://github.com/MetaMask/metamask-mobile/pull/3080): [UPDATE] Update custom token copy
- [#3069](https://github.com/MetaMask/metamask-mobile/pull/3069): [UPGRADE] Bump @react-native-community/cookies from 4.0.1 to 5.0.1
- [#2931](https://github.com/MetaMask/metamask-mobile/pull/2931): [UPGRADE] Bump regenerator-runtime from 0.13.1 to 0.13.9
- [#2526](https://github.com/MetaMask/metamask-mobile/pull/2526): [UPGRADE] Bump redux-persist from 5.10.0 to 6.0.0
- [#3028](https://github.com/MetaMask/metamask-mobile/pull/3028): [FEATURE] Update Recents
- [#3057](https://github.com/MetaMask/metamask-mobile/pull/3057): [UPDATE] Remove SwapsLiveness checks for non supported networks

## v3.2.0 - August 24 2021
- [#3046](https://github.com/MetaMask/metamask-mobile/pull/3046): [FIX] Token Transfer to address
- [#2878](https://github.com/MetaMask/metamask-mobile/pull/2878): [2783] Change default account name for ENS reversed-resolved name
- [#3029](https://github.com/MetaMask/metamask-mobile/pull/3029): [FIX] Video Subtitles Not Loading Properly
- [#3038](https://github.com/MetaMask/metamask-mobile/pull/3038): [FIX] increase the heap size to help mitigate the out of memory issue on Android
- [#3013](https://github.com/MetaMask/metamask-mobile/pull/3013): Swaps V2 Integration
- [#2718](https://github.com/MetaMask/metamask-mobile/pull/2718): Switched to sslip.io instead of xip.io

## v3.1.0 - August 12 2021
- [#3026](https://github.com/MetaMask/metamask-mobile/pull/3026): [FIX] Fix edit button
- [#2981](https://github.com/MetaMask/metamask-mobile/pull/2981): [FIX] Delete Message
- [#3017](https://github.com/MetaMask/metamask-mobile/pull/3017): [FIX] Fix deep links bug related to branch updates
- [#2972](https://github.com/MetaMask/metamask-mobile/pull/2972): [FEATURE] - Storage Limit - Reduce Txs Being Stored
- [#2999](https://github.com/MetaMask/metamask-mobile/pull/2999): [FIX] Account for `txParams.data` when we sync
- [#2961](https://github.com/MetaMask/metamask-mobile/pull/2961): [FIX] GH Action Permission for Bump-Version
- [#2980](https://github.com/MetaMask/metamask-mobile/pull/2980): [FIX] Fix header layout
- [#2907](https://github.com/MetaMask/metamask-mobile/pull/2907): [FIX] Remove extra top padding on send flow
- [#2808](https://github.com/MetaMask/metamask-mobile/pull/2808): [FIX] Issue #2763
- [#2956](https://github.com/MetaMask/metamask-mobile/pull/2956): [UPGRADE] walletconnect
- [#2996](https://github.com/MetaMask/metamask-mobile/pull/2996): [FIX] Add TransakWebview mediaPlayback props for KYC
- [#2804](https://github.com/MetaMask/metamask-mobile/pull/2804): [UPGRADE] Branch updates
- [#2813](https://github.com/MetaMask/metamask-mobile/pull/2813): [FEATURE] Secret Recovery Phrase Video Subtitles
- [#2893](https://github.com/MetaMask/metamask-mobile/pull/2893): [FIX] Address bar icon
- [#2973](https://github.com/MetaMask/metamask-mobile/pull/2973): [FEATURE] On-Ramp: Add on-ramp analytics

## v3.0.1 - August 4 2021
- Patch to fix Wyre and Transak

## v3.0.0 - July 28 2021
- [#2959](https://github.com/MetaMask/metamask-mobile/pull/2959): UI fixes
- [#2957](https://github.com/MetaMask/metamask-mobile/pull/2957): Fix gas information info modal on swaps
- [#2955](https://github.com/MetaMask/metamask-mobile/pull/2955): [EIP1559] Improve time estimates
- [#2952](https://github.com/MetaMask/metamask-mobile/pull/2952): Bump controllers to v14.0.2
- [#2798](https://github.com/MetaMask/metamask-mobile/pull/2798): [EIP1559] Base for Edit Gas Fee screen
- [#2943](https://github.com/MetaMask/metamask-mobile/pull/2943): [FIX] Fix typos when adding TokensController & CollectiblesController
- [#2795](https://github.com/MetaMask/metamask-mobile/pull/2795): Swaps: Use quotes conversion rate
- [#2909](https://github.com/MetaMask/metamask-mobile/pull/2909): Account for speedUp in transaction list
- [#2729](https://github.com/MetaMask/metamask-mobile/pull/2729): Swaps: Add custom token flow - search by address and get it imported to your wallet
- [#2863](https://github.com/MetaMask/metamask-mobile/pull/2863): Allow custom network fiat values
- [#2881](https://github.com/MetaMask/metamask-mobile/pull/2881): Split AssetsController into TokensController and CollectiblesController
- [#2934](https://github.com/MetaMask/metamask-mobile/pull/2934): Removed sentry debug requirement for non release builds
- [#2889](https://github.com/MetaMask/metamask-mobile/pull/2889): Feature/bitrise
- [#2890](https://github.com/MetaMask/metamask-mobile/pull/2890): Bump addressable from 2.7.0 to 2.8.0 in /ios

## v2.6.0 - July 9 2021
- [#2865](https://github.com/MetaMask/metamask-mobile/pull/2865): Added support for custom network gas estimates
- [#2854](https://github.com/MetaMask/metamask-mobile/pull/2854): Fix time formatting on transactions
- [#2883](https://github.com/MetaMask/metamask-mobile/pull/2883): Swaps: Fix isZero undefined error
- [#2731](https://github.com/MetaMask/metamask-mobile/pull/2731): Improvement/react navigation upgrade 5
- [#2709](https://github.com/MetaMask/metamask-mobile/pull/2709): Remove Picker deprecation warning

## v2.5.0 - June 15 2021
- [#2809](https://github.com/MetaMask/metamask-mobile/pull/2809): Optional chaining dollarBalance
- [#2776](https://github.com/MetaMask/metamask-mobile/pull/2776): Fix: empty state when using fiat on non-mainnet transactions
- [#2777](https://github.com/MetaMask/metamask-mobile/pull/2777): Add isInteraction: false
- [#2759](https://github.com/MetaMask/metamask-mobile/pull/2759): Use MediaPlayer
- [#2748](https://github.com/MetaMask/metamask-mobile/pull/2748): v2.5.0
- [#2757](https://github.com/MetaMask/metamask-mobile/pull/2757): Circleci fix
- [#2746](https://github.com/MetaMask/metamask-mobile/pull/2746): bugfix/notification visibility
- [#2749](https://github.com/MetaMask/metamask-mobile/pull/2749): @metamask/controllers@10.1.0
- [#2702](https://github.com/MetaMask/metamask-mobile/pull/2702): Swaps: Update Market price unavailable and Price impact text
- [#2701](https://github.com/MetaMask/metamask-mobile/pull/2701): Swaps: Allow every token on user wallet to be swapped
- [#2617](https://github.com/MetaMask/metamask-mobile/pull/2617): On-Ramp: Refactor and Wyre countries
- [#2611](https://github.com/MetaMask/metamask-mobile/pull/2611): Educate gas fees
- [#2738](https://github.com/MetaMask/metamask-mobile/pull/2738): Feature/simplify custom gas
- [#2741](https://github.com/MetaMask/metamask-mobile/pull/2741): bugfix/notifications reducer
- [#2626](https://github.com/MetaMask/metamask-mobile/pull/2626): @metamask/mobile-provider@2.1.0
- [#2706](https://github.com/MetaMask/metamask-mobile/pull/2706): make null conversionrate safe
- [#2703](https://github.com/MetaMask/metamask-mobile/pull/2703): Convert token id to hexadecimal for collectible transfer
- [#2742](https://github.com/MetaMask/metamask-mobile/pull/2742): Bugfix/fix ws resolution
- [#2713](https://github.com/MetaMask/metamask-mobile/pull/2713): Feature/bitrise circle ci hybrid
- [#2711](https://github.com/MetaMask/metamask-mobile/pull/2711): Feature/use same media player
- [#2728](https://github.com/MetaMask/metamask-mobile/pull/2728): Add iconUrls to allowed list of keys
- [#2737](https://github.com/MetaMask/metamask-mobile/pull/2737): Add resolution for ws to address security vuln
- [#2727](https://github.com/MetaMask/metamask-mobile/pull/2727): Add missing required prop in tests

## v2.4.0 - May 21 2021
- [#2618](https://github.com/MetaMask/metamask-mobile/pull/2618): Collectibles experience
- [#2698](https://github.com/MetaMask/metamask-mobile/pull/2698): bugfix: navigation routeName is null
- [#2692](https://github.com/MetaMask/metamask-mobile/pull/2692): Fix custom gas crash
- [#2649](https://github.com/MetaMask/metamask-mobile/pull/2649): Migrate to new CurrencyRateController
- [#2697](https://github.com/MetaMask/metamask-mobile/pull/2697): Set ignoreSilentSwitch and reset the video onEnd
- [#2691](https://github.com/MetaMask/metamask-mobile/pull/2691): Feature/update casing secret recovery phrase
- [#2694](https://github.com/MetaMask/metamask-mobile/pull/2694): Swaps: Add chainId to swaps analytics
- [#2687](https://github.com/MetaMask/metamask-mobile/pull/2687): bufix: stuck notification
- [#2689](https://github.com/MetaMask/metamask-mobile/pull/2689): Fix "use max" in send flow
- [#2672](https://github.com/MetaMask/metamask-mobile/pull/2672): Fix xcode upgrade
- [#2640](https://github.com/MetaMask/metamask-mobile/pull/2640): Swaps: Add name from metadata to swaps tokens
- [#2628](https://github.com/MetaMask/metamask-mobile/pull/2628): Feature/use toLowerCaseCompare

## v2.3.0 - May 5 2021
- [#2674](https://github.com/MetaMask/metamask-mobile/pull/2674): Fix deploy contract and create token testnets
- [#2669](https://github.com/MetaMask/metamask-mobile/pull/2669): Key off accounts
- [#2670](https://github.com/MetaMask/metamask-mobile/pull/2670): Bump hosted-git-info from 2.8.8 to 2.8.9
- [#2667](https://github.com/MetaMask/metamask-mobile/pull/2667): added export of iOS artifacts
- [#2664](https://github.com/MetaMask/metamask-mobile/pull/2664): updated version code and change logs
- [#2663](https://github.com/MetaMask/metamask-mobile/pull/2663): Load video over the network
- [#2656](https://github.com/MetaMask/metamask-mobile/pull/2656): Fix Balance undefined for deeplink payment requests
- [#2657](https://github.com/MetaMask/metamask-mobile/pull/2657): Fix missing seed phrase updates
- [#2645](https://github.com/MetaMask/metamask-mobile/pull/2645): Safe navbar for iphone 12
- [#2643](https://github.com/MetaMask/metamask-mobile/pull/2643): Fix undefined is not an object identities[selectedAddress].importTime
- [#2639](https://github.com/MetaMask/metamask-mobile/pull/2639): Exclude native asset from hiding when balance is zero
- [#2631](https://github.com/MetaMask/metamask-mobile/pull/2631): updated change log
- [#2633](https://github.com/MetaMask/metamask-mobile/pull/2633): Address yarn audit
- [#2625](https://github.com/MetaMask/metamask-mobile/pull/2625): Fix isZero is undefined
- [#2444](https://github.com/MetaMask/metamask-mobile/pull/2444): Implement 'hide zero balance token' setting for token balances on home screen
- [#2621](https://github.com/MetaMask/metamask-mobile/pull/2621): RC v2.3.0
- [#2605](https://github.com/MetaMask/metamask-mobile/pull/2605): Feature/update seed phrase wording
- [#2564](https://github.com/MetaMask/metamask-mobile/pull/2564): Improve rpc errors logging and removing user rejected errors
- [#2556](https://github.com/MetaMask/metamask-mobile/pull/2556): Fix/respect custom spend limit on dapp approve modal
- [#2614](https://github.com/MetaMask/metamask-mobile/pull/2614): updated lock files
- [#2586](https://github.com/MetaMask/metamask-mobile/pull/2586): Upgrade swaps-controller v4
- [#2613](https://github.com/MetaMask/metamask-mobile/pull/2613): remove typo
- [#2603](https://github.com/MetaMask/metamask-mobile/pull/2603): Bugfix/android anr
- [#2565](https://github.com/MetaMask/metamask-mobile/pull/2565): This will fix sentry errors with no title by using the extra info as a title
- [#2552](https://github.com/MetaMask/metamask-mobile/pull/2552): Upgrade wallet connect
- [#2607](https://github.com/MetaMask/metamask-mobile/pull/2607): Detox/Fix failing tests
- [#2604](https://github.com/MetaMask/metamask-mobile/pull/2604): Don't hide url modal on emulator
- [#2529](https://github.com/MetaMask/metamask-mobile/pull/2529): Move some errors to analytics instead of sentry
- [#2446](https://github.com/MetaMask/metamask-mobile/pull/2446): Add New Zealand Dollar to currency options
- [#2464](https://github.com/MetaMask/metamask-mobile/pull/2464): Feature/confusables
- [#2610](https://github.com/MetaMask/metamask-mobile/pull/2610): fix typeface on login text field
- [#2416](https://github.com/MetaMask/metamask-mobile/pull/2416): Replace controller context
- [#2590](https://github.com/MetaMask/metamask-mobile/pull/2590): Fix adding custom token in custom network
- [#2470](https://github.com/MetaMask/metamask-mobile/pull/2470): only add custom tokens if not in mainnet
- [#2524](https://github.com/MetaMask/metamask-mobile/pull/2524): Address yarn lints
- [#2588](https://github.com/MetaMask/metamask-mobile/pull/2588): Upgrade .nvmrc to node v14
- [#2514](https://github.com/MetaMask/metamask-mobile/pull/2514): Swaps: Add cache thresholds configuration
- [#2468](https://github.com/MetaMask/metamask-mobile/pull/2468): Swaps: BSC Support
- [#2539](https://github.com/MetaMask/metamask-mobile/pull/2539): Use node 14
- [#2568](https://github.com/MetaMask/metamask-mobile/pull/2568): resolve isENS without case sensitivity (#2545)

## v2.2.0 - Apr 21 2021
- [#2547](https://github.com/MetaMask/metamask-mobile/pull/2547): Include decimalsToShow in balanceToFiatNumber
- [#2554](https://github.com/MetaMask/metamask-mobile/pull/2554): Bug fix/sync import time
- [#2546](https://github.com/MetaMask/metamask-mobile/pull/2546): Fix analytics try catch
- [#2543](https://github.com/MetaMask/metamask-mobile/pull/2543): Only get nonce from the network if the feature is enabled
- [#2460](https://github.com/MetaMask/metamask-mobile/pull/2460): Feature/tx local state logs
- [#2540](https://github.com/MetaMask/metamask-mobile/pull/2540): bump v2.1.2
- [#2538](https://github.com/MetaMask/metamask-mobile/pull/2538): fix/connection change handler
- [#2375](https://github.com/MetaMask/metamask-mobile/pull/2375): Style updates
- [#2536](https://github.com/MetaMask/metamask-mobile/pull/2536): Change Send Feedback to Request a Feature and update link
- [#2485](https://github.com/MetaMask/metamask-mobile/pull/2485): Fix notification so it doesn't block terms + conditions
- [#2469](https://github.com/MetaMask/metamask-mobile/pull/2469): Bug/persists old account names
- [#2534](https://github.com/MetaMask/metamask-mobile/pull/2534): Fix typo
- [#2373](https://github.com/MetaMask/metamask-mobile/pull/2373): use contract metadata version from package
- [#2520](https://github.com/MetaMask/metamask-mobile/pull/2520): Check infura availability
- [#2371](https://github.com/MetaMask/metamask-mobile/pull/2371): Feature/custom nonce
- [#2521](https://github.com/MetaMask/metamask-mobile/pull/2521): Bump v2.1.1
- [#2493](https://github.com/MetaMask/metamask-mobile/pull/2493): rename master to main
- [#2447](https://github.com/MetaMask/metamask-mobile/pull/2447): Bump vm-browserify from 0.0.4 to 1.1.2
- [#2501](https://github.com/MetaMask/metamask-mobile/pull/2501): Bump jest-serializer from 24.4.0 to 26.6.2
- [#2499](https://github.com/MetaMask/metamask-mobile/pull/2499): Bump react-native-share from 3.3.2 to 5.2.2
- [#2411](https://github.com/MetaMask/metamask-mobile/pull/2411): Bump json-rpc-middleware-stream from 2.1.1 to 3.0.0
- [#2406](https://github.com/MetaMask/metamask-mobile/pull/2406): Bump eslint-plugin-prettier from 3.3.0 to 3.3.1
- [#2403](https://github.com/MetaMask/metamask-mobile/pull/2403): Bump babel-eslint from 10.0.3 to 10.1.0
- [#2381](https://github.com/MetaMask/metamask-mobile/pull/2381): Display correct number of decimals for 'usd' fiat

## v2.1.3 - Apr 19 2021
- [#2548](https://github.com/MetaMask/metamask-mobile/pull/2548): Hotfix analytics try catch

## v2.1.2 - Apr 16 2021
- [#2538](https://github.com/MetaMask/metamask-mobile/pull/2538): fix/connection change handler

## v2.1.1 - Apr 14 2021
- [#2520](https://github.com/MetaMask/metamask-mobile/pull/2520): Check provider status

## v2.1.0 - Apr 12 2021
- [#2487](https://github.com/MetaMask/metamask-mobile/pull/2487): Fix/analytics v1 priority1
- [#2456](https://github.com/MetaMask/metamask-mobile/pull/2456): Analytics v2 (priority 1)
- [#2408](https://github.com/MetaMask/metamask-mobile/pull/2408): Fix/gas estimations
- [#2479](https://github.com/MetaMask/metamask-mobile/pull/2479): remove controllers tgz
- [#2441](https://github.com/MetaMask/metamask-mobile/pull/2441): Improvement/assets by chainid
- [#2442](https://github.com/MetaMask/metamask-mobile/pull/2442): Improvement/chain ticker
- [#2372](https://github.com/MetaMask/metamask-mobile/pull/2372): Remove instapay
- [#2467](https://github.com/MetaMask/metamask-mobile/pull/2467): Fix iOS build
- [#2084](https://github.com/MetaMask/metamask-mobile/pull/2084): Migrate from AsyncStorage to FileStorage
- [#2443](https://github.com/MetaMask/metamask-mobile/pull/2443): Update terms and privacy links
- [#2318](https://github.com/MetaMask/metamask-mobile/pull/2318): Add custom network rpc API
- [#2306](https://github.com/MetaMask/metamask-mobile/pull/2306): Feature/high gas warn
- [#2463](https://github.com/MetaMask/metamask-mobile/pull/2463): update pods
- [#2448](https://github.com/MetaMask/metamask-mobile/pull/2448): Add resolution for netmask
- [#2445](https://github.com/MetaMask/metamask-mobile/pull/2445): Add resolution for y18n
- [#2404](https://github.com/MetaMask/metamask-mobile/pull/2404): Bump react-native-branch from 5.0.0 to 5.0.1
- [#2439](https://github.com/MetaMask/metamask-mobile/pull/2439): json-rpc-engine@6.1.0
- [#2413](https://github.com/MetaMask/metamask-mobile/pull/2413): remove "git add" per husky warning
- [#2431](https://github.com/MetaMask/metamask-mobile/pull/2431): Update BN import

## v2.0.1 - Mar 24 2021
- [#2430](https://github.com/MetaMask/metamask-mobile/pull/2430): Fix/send to style
- [#2426](https://github.com/MetaMask/metamask-mobile/pull/2426): bugfix/allow seedphrases when locked
- [#2422](https://github.com/MetaMask/metamask-mobile/pull/2422): bugfix/delete wallet with random password
- [#2417](https://github.com/MetaMask/metamask-mobile/pull/2417): Bugfix/sync improvements
- [#2418](https://github.com/MetaMask/metamask-mobile/pull/2418): V2 fixes
- [#2156](https://github.com/MetaMask/metamask-mobile/pull/2156): Translations with update script

## v2.0.0 - Mar 16 2021
- [#2383](https://github.com/MetaMask/metamask-mobile/pull/2383): swaps/received destination amount
- [#2379](https://github.com/MetaMask/metamask-mobile/pull/2379): Swaps/fix decode tx render amounts
- [#2377](https://github.com/MetaMask/metamask-mobile/pull/2377): bugfix/dont modify local transactions
- [#2376](https://github.com/MetaMask/metamask-mobile/pull/2376): Swaps: Sort quotes by asc fees when destination amount is the same
- [#2370](https://github.com/MetaMask/metamask-mobile/pull/2370): bugfix/swaps bugs
- [#2321](https://github.com/MetaMask/metamask-mobile/pull/2321): Swaps v1
- [#2365](https://github.com/MetaMask/metamask-mobile/pull/2365): bugfix/transactions filtering
- [#2253](https://github.com/MetaMask/metamask-mobile/pull/2253): Use Etherscan API for incoming token transactions
- [#2245](https://github.com/MetaMask/metamask-mobile/pull/2245): Fix transaction history
- [#2363](https://github.com/MetaMask/metamask-mobile/pull/2363): fix: `poll` after notification don't `refresh`
- [#2344](https://github.com/MetaMask/metamask-mobile/pull/2344): Sync with extension chain id
- [#2269](https://github.com/MetaMask/metamask-mobile/pull/2269): @metamask/contract-metadata@1.23.0
- [#2357](https://github.com/MetaMask/metamask-mobile/pull/2357): Update `elliptic` to v6.5.4 to address security advisory
- [#2247](https://github.com/MetaMask/metamask-mobile/pull/2247): Provide chainId correctly
- [#2196](https://github.com/MetaMask/metamask-mobile/pull/2196): improvement/handle provider updates
- [#2157](https://github.com/MetaMask/metamask-mobile/pull/2157): Swaps: Alpha 2
- [#2272](https://github.com/MetaMask/metamask-mobile/pull/2272): Update twitter handle in README
- [#2265](https://github.com/MetaMask/metamask-mobile/pull/2265): Fix input state

## v1.0.11 - Feb 15 2021
- [#2257](https://github.com/MetaMask/metamask-mobile/pull/2257): bugfix/use bignumber for transfer deeplinks
- [#2256](https://github.com/MetaMask/metamask-mobile/pull/2256): Fix account list scroll
- [#2243](https://github.com/MetaMask/metamask-mobile/pull/2243): TransactionController from controllers
- [#2240](https://github.com/MetaMask/metamask-mobile/pull/2240): Fix circleci apk
- [#2176](https://github.com/MetaMask/metamask-mobile/pull/2176): Feature/warn when replacing
- [#2233](https://github.com/MetaMask/metamask-mobile/pull/2233): contract metadata images bump
- [#2148](https://github.com/MetaMask/metamask-mobile/pull/2148): Handle `balanceError` case
- [#2228](https://github.com/MetaMask/metamask-mobile/pull/2228): Remove best deals badge from WYRE transfers.
- [#2217](https://github.com/MetaMask/metamask-mobile/pull/2217): @metamask/controllers@6.0.1
- [#2180](https://github.com/MetaMask/metamask-mobile/pull/2180): Fix cloudflare redirects
- [#2203](https://github.com/MetaMask/metamask-mobile/pull/2203): Update @metamask/contract-metadata
- [#2078](https://github.com/MetaMask/metamask-mobile/pull/2078): React Native update to 0.63
- [#2204](https://github.com/MetaMask/metamask-mobile/pull/2204): Create dependabot.yml
- [#2193](https://github.com/MetaMask/metamask-mobile/pull/2193): Fix "Text strings must be rendered within a <Text> component"
- [#2191](https://github.com/MetaMask/metamask-mobile/pull/2191): Use navigate instead of push
- [#2174](https://github.com/MetaMask/metamask-mobile/pull/2174): Add fiat on ramp modal close button extra hit area
- [#2104](https://github.com/MetaMask/metamask-mobile/pull/2104): bugfix/token tx ui amount parsing
- [#2166](https://github.com/MetaMask/metamask-mobile/pull/2166): v1.0.10
- [#2142](https://github.com/MetaMask/metamask-mobile/pull/2142): Display boolean values when signing typed data
- [#2079](https://github.com/MetaMask/metamask-mobile/pull/2079): bugfix/tx to contract validation
- [#2103](https://github.com/MetaMask/metamask-mobile/pull/2103): bugfix/erc20 allowance ui
- [#2158](https://github.com/MetaMask/metamask-mobile/pull/2158): engine swaps flag
- [#2060](https://github.com/MetaMask/metamask-mobile/pull/2060): MetaSwaps Alpha
- [#2142](https://github.com/MetaMask/metamask-mobile/pull/2142): Display boolean values when signing typed data

## v1.0.10 - Jan 25 2021
- [#2164](https://github.com/MetaMask/metamask-mobile/pull/2164): Initialize NetworkController.provider with chainId (#2164)
- [#2161](https://github.com/MetaMask/metamask-mobile/pull/2161): chainid migration (#2161)

## v1.0.9 - Jan 21 2021
- [#2149](https://github.com/MetaMask/metamask-mobile/pull/2149): update tests for new logic
- [#2145](https://github.com/MetaMask/metamask-mobile/pull/2145): Add missing brew installation steps
- [#2146](https://github.com/MetaMask/metamask-mobile/pull/2146): @metamask/mobile-provider@2.0.1
- [#2144](https://github.com/MetaMask/metamask-mobile/pull/2144): @walletconnect@1.3.4
- [#2143](https://github.com/MetaMask/metamask-mobile/pull/2143): Fix alert from iframes
- [#2134](https://github.com/MetaMask/metamask-mobile/pull/2134): Update podfile (#2134)
- [#2131](https://github.com/MetaMask/metamask-mobile/pull/2131): controllers v6.0.0 (#2131)
- [#2120](https://github.com/MetaMask/metamask-mobile/pull/2120): bugfix/accounts undefined (#2120)
- [#1987](https://github.com/MetaMask/metamask-mobile/pull/1987): Replace public config with rpc (#1987)
- [#2070](https://github.com/MetaMask/metamask-mobile/pull/2070): Fix android injection (#2070)
- [#2109](https://github.com/MetaMask/metamask-mobile/pull/2109): Remove support email (#2109)
- [#2044](https://github.com/MetaMask/metamask-mobile/pull/2044): Remove sync with extension from settings (#2044)
- [#2083](https://github.com/MetaMask/metamask-mobile/pull/2083): Improvement/gas estimations (#2083)
- [#2076](https://github.com/MetaMask/metamask-mobile/pull/2076): Feature/make insufficient fee descriptive (#2076)
- [#2099](https://github.com/MetaMask/metamask-mobile/pull/2099): Bump axios from 0.19.2 to 0.21.1 (#2099)
- [#2072](https://github.com/MetaMask/metamask-mobile/pull/2072): Bump ini from 1.3.5 to 1.3.8 (#2072)
- [#2071](https://github.com/MetaMask/metamask-mobile/pull/2071): Fix uploading files on the browser by modifying fingerprint intent value (#2071)
- [#2064](https://github.com/MetaMask/metamask-mobile/pull/2064): Add parseSeedPhrase behavior from extension (#2064)
- [#2061](https://github.com/MetaMask/metamask-mobile/pull/2061): Add Alert component (#2061)
- [#2059](https://github.com/MetaMask/metamask-mobile/pull/2059): Fix isBookmark functionality (#2059)
- [#2030](https://github.com/MetaMask/metamask-mobile/pull/2030): @metamask/controllers@5.1.0 (#2030)
- [#2051](https://github.com/MetaMask/metamask-mobile/pull/2051): [1984] Fixing Invalid value for 'projectId': "undefined" error [Android] [iOS] (#2051)
- [#2042](https://github.com/MetaMask/metamask-mobile/pull/2042): Bugfix/small UI fixes (#2042)
- [#2054](https://github.com/MetaMask/metamask-mobile/pull/2054): Make Keypad a functional component (#2054)
- [#2055](https://github.com/MetaMask/metamask-mobile/pull/2055): Add missing await keywords (#2055)
- [#2000](https://github.com/MetaMask/metamask-mobile/pull/2000): Remove unused views (#2000)
- [#1994](https://github.com/MetaMask/metamask-mobile/pull/1994): Feature: Initial Swaps amount view (#1994)

## v1.0.8 - Dec 2 2020
- [#2040](https://github.com/MetaMask/metamask-mobile/pull/2040): Update vault error message (#2040)
- [#2034](https://github.com/MetaMask/metamask-mobile/pull/2034): Fix asyncstorage limit (#2034)
- [#2038](https://github.com/MetaMask/metamask-mobile/pull/2038): metamask wc deeplink (#2038)
- [#2023](https://github.com/MetaMask/metamask-mobile/pull/2023): @metamask/contract-metadata (#2023)
- [#2019](https://github.com/MetaMask/metamask-mobile/pull/2019): bugfix/qr code (#2019)
- [#2008](https://github.com/MetaMask/metamask-mobile/pull/2008): Add Apple Pay correct label (#2008)

## v1.0.7 - Nov 17 2020
- [#2005](https://github.com/MetaMask/metamask-mobile/pull/2005): Fix activeTabUrl (#2005)
- [#2003](https://github.com/MetaMask/metamask-mobile/pull/2003): Bugfix/android choose password (#2003)
- [#1992](https://github.com/MetaMask/metamask-mobile/pull/1992): Android api level (#1992)
- [#1993](https://github.com/MetaMask/metamask-mobile/pull/1993): Catch SVG Errors (#1993)
- [#1970](https://github.com/MetaMask/metamask-mobile/pull/1970): Remove network status controller (#1970)
- [#1968](https://github.com/MetaMask/metamask-mobile/pull/1968): Add MetaSwaps feature flag and initial nav stack (#1968)
- [#1967](https://github.com/MetaMask/metamask-mobile/pull/1967): Add Keypad component (#1967)


## v1.0.6 - Nov 12 2020
- [#1990](https://github.com/MetaMask/metamask-mobile/pull/1990): Fixed importing accounts when reseting password (#1990)
- [#1988](https://github.com/MetaMask/metamask-mobile/pull/1988): bugfix/protect wallet modal (#1988)
- [#1985](https://github.com/MetaMask/metamask-mobile/pull/1985): Fix seedphrase handling in QRScanner (#1985)
- [#1982](https://github.com/MetaMask/metamask-mobile/pull/1982): Bugfix/approve modal (#1982)
- [#1983](https://github.com/MetaMask/metamask-mobile/pull/1983): Fix whats new modal (#1983)
- [#1978](https://github.com/MetaMask/metamask-mobile/pull/1978): Make hintText display regardless of biometryType (#1978)
- [#1973](https://github.com/MetaMask/metamask-mobile/pull/1973): Detox: Updated onboarding flows (#1973)
- [#1780](https://github.com/MetaMask/metamask-mobile/pull/1780): Improvement/update keychain lib (#1780)
- [#1916](https://github.com/MetaMask/metamask-mobile/pull/1916): Fix QR send (#1916)
- [#1877](https://github.com/MetaMask/metamask-mobile/pull/1877): Bugfix/deeplink, request modals and wallet connect (#1877)
- [#1911](https://github.com/MetaMask/metamask-mobile/pull/1911): Feature/whats new (#1911)
- [#1954](https://github.com/MetaMask/metamask-mobile/pull/1954): Support 24 word seed phrase game (#1954)
- [#1892](https://github.com/MetaMask/metamask-mobile/pull/1892): Reminder to backup seed phrase (#1892)
- [#1908](https://github.com/MetaMask/metamask-mobile/pull/1908): Add missing env keys (#1908)
- [#1917](https://github.com/MetaMask/metamask-mobile/pull/1917): Update Wyre minimum fee and minimum amount (#1917)
- [#1915](https://github.com/MetaMask/metamask-mobile/pull/1915): Error boundary - sentry clean-up (#1915)
- [#1905](https://github.com/MetaMask/metamask-mobile/pull/1905): Ensure seedphrase hint is not the actual seedphrase (#1905)
- [#1895](https://github.com/MetaMask/metamask-mobile/pull/1895): Make whole blur area clickable (#1895)
- [#1901](https://github.com/MetaMask/metamask-mobile/pull/1901): sync log errors (#1901)
- [#1879](https://github.com/MetaMask/metamask-mobile/pull/1879): Feature/show previously created accounts on seed phrase import (#1879)
- [#1894](https://github.com/MetaMask/metamask-mobile/pull/1894): sentry cleaning (#1894)
- [#1902](https://github.com/MetaMask/metamask-mobile/pull/1902): use optional chaining and default values so we're not calling toLowerCase() on undefined values (#1902)
- [#1859](https://github.com/MetaMask/metamask-mobile/pull/1859): Direct to proper screen on address QR code scan (#1859)
- [#1881](https://github.com/MetaMask/metamask-mobile/pull/1881): Fix/disable iframes support for now (#1881)
- [#1893](https://github.com/MetaMask/metamask-mobile/pull/1893): bugfix/core env vars (#1893)
- [#1847](https://github.com/MetaMask/metamask-mobile/pull/1847): feature/approve eip 681 (#1847)
- [#1827](https://github.com/MetaMask/metamask-mobile/pull/1827): Update infura v3 (#1827)
- [#1806](https://github.com/MetaMask/metamask-mobile/pull/1806): Allow webview debugging in dev mode + XIP (#1806)
- [#1874](https://github.com/MetaMask/metamask-mobile/pull/1874): Coerce non error objects into errors before sending to sentry (#1874)
- [#1887](https://github.com/MetaMask/metamask-mobile/pull/1887): Use eth-contract-metadata@1.16.0 (#1887)
- [#1883](https://github.com/MetaMask/metamask-mobile/pull/1883): Update Transak params (#1883)
- [#1876](https://github.com/MetaMask/metamask-mobile/pull/1876): Bugfix/homepage injection (#1876)
- [#1793](https://github.com/MetaMask/metamask-mobile/pull/1793): Add cookies clearing (#1793)
- [#1873](https://github.com/MetaMask/metamask-mobile/pull/1873): Provide error feedback without actually submitting (#1873)
- [#1864](https://github.com/MetaMask/metamask-mobile/pull/1864): Add additional isUrl check, closes #1462 (#1864)
- [#1866](https://github.com/MetaMask/metamask-mobile/pull/1866): Fix proptype warning for WebviewError (#1866)
- [#1861](https://github.com/MetaMask/metamask-mobile/pull/1861): Get e2e working for seedphrase and login (#1861)

## v1.0.5 - Oct 26 2020
- [#1889](https://github.com/MetaMask/metamask-mobile/pull/1889): Fix scientific notation string not convertable to BN (#1889)

## v1.0.4 - Oct 9 2020
- [#1882](https://github.com/MetaMask/metamask-mobile/pull/1882): Error boundary (#1882)

## v1.0.3 - Sept 30 2020
- [#1865](https://github.com/MetaMask/metamask-mobile/pull/1865): bugfix/login (#1865)
- [#1863](https://github.com/MetaMask/metamask-mobile/pull/1863): transak countries update (#1863)
- [#1829](https://github.com/MetaMask/metamask-mobile/pull/1829): Improvement/browser refactor (#1829)
- [#1848](https://github.com/MetaMask/metamask-mobile/pull/1848): Allow for 24 length seedphrase on import (#1848)
- [#1857](https://github.com/MetaMask/metamask-mobile/pull/1857): bugfix/splash screen (#1857)
- [#1852](https://github.com/MetaMask/metamask-mobile/pull/1852): Bugfix/sentry v1 (#1852)
- [#1846](https://github.com/MetaMask/metamask-mobile/pull/1846): Amount: fix 'data' value for transaction info not being populated with ERC20 tokens (#1846)
- [#1851](https://github.com/MetaMask/metamask-mobile/pull/1851): Detox/ Update e2e based on v1 updates (#1851)
- [#1853](https://github.com/MetaMask/metamask-mobile/pull/1853): fixed typo on country name (#1853)
- [#1815](https://github.com/MetaMask/metamask-mobile/pull/1815): Add ScrollView so we can scroll to errorMessage (#1815)
- [#1752](https://github.com/MetaMask/metamask-mobile/pull/1752): Send caught errors to sentry (#1752)
- [#1794](https://github.com/MetaMask/metamask-mobile/pull/1794): Feature/hide seedphrase on import (#1794)
- [#1841](https://github.com/MetaMask/metamask-mobile/pull/1841): Fixing typo in onboarding flow (#1841)
- [#1845](https://github.com/MetaMask/metamask-mobile/pull/1845): Share address from sidebar (#1845)
- [#1835](https://github.com/MetaMask/metamask-mobile/pull/1835): UI/CustomGas: fix inconsistent low gas error (#1835)
- [#1758](https://github.com/MetaMask/metamask-mobile/pull/1758): Fix wallet_scanQRCode rpc method (#1758)
- [#1831](https://github.com/MetaMask/metamask-mobile/pull/1831): Get paste context working for password fields (onboarding) (#1831)
- [#1837](https://github.com/MetaMask/metamask-mobile/pull/1837): Add gms:play-services-wallet (#1837)
- [#1830](https://github.com/MetaMask/metamask-mobile/pull/1830): Use FlatList for scan steps modal (#1830)
- [#1797](https://github.com/MetaMask/metamask-mobile/pull/1797): Bugfixes/post v1 aug 2020 (#1797)
- [#1801](https://github.com/MetaMask/metamask-mobile/pull/1801): Update gradle (#1801)
- [#1757](https://github.com/MetaMask/metamask-mobile/pull/1757): Add option to use Blockies Identicon and use Jazz Icons as default (#1757)
- [#1816](https://github.com/MetaMask/metamask-mobile/pull/1816): Update about to inclue "Contact Us" link (#1816)
- [#1775](https://github.com/MetaMask/metamask-mobile/pull/1775): WalletConnect: fix WC not respecting gas limit (#1775)
- [#1800](https://github.com/MetaMask/metamask-mobile/pull/1800): Feature/improve nav browser title (#1800)
- [#1781](https://github.com/MetaMask/metamask-mobile/pull/1781): Bugfix/Use translations for steps (#1781)
- [#1759](https://github.com/MetaMask/metamask-mobile/pull/1759): Bugfix/Display correct balance from state when creating an account that already holds funds (#1759)
- [#1728](https://github.com/MetaMask/metamask-mobile/pull/1728): Add /constants (#1728)
- [#1787](https://github.com/MetaMask/metamask-mobile/pull/1787): Add missing currency conversions (#1787)

## v1.0.2 - Sept 2 2020
- [#1812](https://github.com/MetaMask/metamask-mobile/pull/1812): Add logger on login (#1812)

## v1.0.1 - Sept 1 2020
- [#1795](https://github.com/MetaMask/metamask-mobile/pull/1795): Update react native aes crypto forked (#1795)
- [#1796](https://github.com/MetaMask/metamask-mobile/pull/1796): bugfix/mixpanel android in app notifications (#1796)

## v1.0.0 - Aug 26 2020
- [#1790](https://github.com/MetaMask/metamask-mobile/pull/1790): Bugfix/payment request and wallet connect origin on tx (#1790)
- [#1791](https://github.com/MetaMask/metamask-mobile/pull/1791): Fix send receive buttons style (#1791)
- [#1785](https://github.com/MetaMask/metamask-mobile/pull/1785): Use @metamask/controllers@2.0.5 (#1785)
- [#1788](https://github.com/MetaMask/metamask-mobile/pull/1788): bugfix/protect wallet modal receive request (#1788)
- [#1666](https://github.com/MetaMask/metamask-mobile/pull/1666): Fiat on Ramp: Payments (#1666)
- [#1783](https://github.com/MetaMask/metamask-mobile/pull/1783): bugfix/hide protect wallet modal (#1783)
- [#1779](https://github.com/MetaMask/metamask-mobile/pull/1779): Update camera lib (#1779)
- [#1782](https://github.com/MetaMask/metamask-mobile/pull/1782): Make backup required when user has funds (#1782)
- [#1778](https://github.com/MetaMask/metamask-mobile/pull/1778): Update bip to use js version of pbkdf2 even more specific use case (#1778)
- [#1776](https://github.com/MetaMask/metamask-mobile/pull/1776): Use JS pbkdf2 if using chrome devtools (bip39) (#1776)
- [#1773](https://github.com/MetaMask/metamask-mobile/pull/1773): Improvement/import from seed styles (#1773)
- [#1772](https://github.com/MetaMask/metamask-mobile/pull/1772): bugfix/cancel dapp tx when inactive (#1772)
- [#1769](https://github.com/MetaMask/metamask-mobile/pull/1769): Patch bip39 to use native crypto lib pbkdf2 (#1769)
- [#1766](https://github.com/MetaMask/metamask-mobile/pull/1766): Feature/ipns ens sites (#1766)
- [#1755](https://github.com/MetaMask/metamask-mobile/pull/1755): Improvement/migrate aes crypto lib (#1755)
- [#1756](https://github.com/MetaMask/metamask-mobile/pull/1756): Fix recreate vault import accounts (#1756)
- [#1729](https://github.com/MetaMask/metamask-mobile/pull/1729): Lock KeyringController on logout (#1729)
- [#1767](https://github.com/MetaMask/metamask-mobile/pull/1767): Fix crash when entering custom token (#1767)
- [#1765](https://github.com/MetaMask/metamask-mobile/pull/1765): Browser newPageData state undefined (#1765)
- [#1762](https://github.com/MetaMask/metamask-mobile/pull/1762): Use patch-package@6.2.2 (#1762)
- [#1763](https://github.com/MetaMask/metamask-mobile/pull/1763): Remove unused metamask-mobile-provider dependency (#1763)
- [#1736](https://github.com/MetaMask/metamask-mobile/pull/1736): Amount: fix comma causing invalid send amount (#1736)
- [#1711](https://github.com/MetaMask/metamask-mobile/pull/1711): Improve iOS build process (#1711)
- [#1733](https://github.com/MetaMask/metamask-mobile/pull/1733): @metamask/controllers 2.0.3 (#1733)
- [#1727](https://github.com/MetaMask/metamask-mobile/pull/1727): Bump json from 2.2.0 to 2.3.1 in /ios (#1727)

## v0.2.20 - Aug 6 2020
- [#1751](https://github.com/MetaMask/metamask-mobile/pull/1751): bugfix/payment requests & deeplinks (#1751)
- [#1732](https://github.com/MetaMask/metamask-mobile/pull/1732): Copy edits (#1732)
- [#1750](https://github.com/MetaMask/metamask-mobile/pull/1750): Don't allow for zero in custom gas price (#1750)
- [#1744](https://github.com/MetaMask/metamask-mobile/pull/1744): bugix/v0.2.20 (#1744)
- [#1730](https://github.com/MetaMask/metamask-mobile/pull/1730): Check for pods first, don't double up on yarn install(s) (#1730)
- [#1734](https://github.com/MetaMask/metamask-mobile/pull/1734): Use elliptic@6.5.3 (#1734)
- [#1741](https://github.com/MetaMask/metamask-mobile/pull/1741): Bugfix/skipping going to next step before (#1741)
- [#1737](https://github.com/MetaMask/metamask-mobile/pull/1737): Fix scroll and button text and secure now goes to next step (#1737)
- [#1740](https://github.com/MetaMask/metamask-mobile/pull/1740): check previousScreen and change lading message (#1740)
- [#1738](https://github.com/MetaMask/metamask-mobile/pull/1738): Bump no_output_timeout (#1738)
- [#1735](https://github.com/MetaMask/metamask-mobile/pull/1735): Switch dependency Git URLs to HTTPS (#1735)
- [#1681](https://github.com/MetaMask/metamask-mobile/pull/1681): Feature/account backup alert flows (#1681)
- [#1692](https://github.com/MetaMask/metamask-mobile/pull/1692): Update password & seedphrase backup flow (#1692)
- [#1718](https://github.com/MetaMask/metamask-mobile/pull/1718): @metamask/mobile-provider v1.3.0 (#1718)
- [#1710](https://github.com/MetaMask/metamask-mobile/pull/1710): 'Use Max' fixes (#1710)
- [#1712](https://github.com/MetaMask/metamask-mobile/pull/1712): Bugfix/payment requests (#1712)
- [#1708](https://github.com/MetaMask/metamask-mobile/pull/1708): bugfix/deep link send screen token ui (#1708)
- [#1694](https://github.com/MetaMask/metamask-mobile/pull/1694): Update font Euclid (#1694)
- [#1699](https://github.com/MetaMask/metamask-mobile/pull/1699): ChoosePassword: update preferencesControllerState after adding accounts, before passing into PreferencesController.update() (#1699)
- [#1707](https://github.com/MetaMask/metamask-mobile/pull/1707): update apple id (#1707)
- [#1704](https://github.com/MetaMask/metamask-mobile/pull/1704): Use lodash@4.17.19 (#1704)
- [#1687](https://github.com/MetaMask/metamask-mobile/pull/1687): Custom Gas + Data hotfixes (#1687)
- [#1697](https://github.com/MetaMask/metamask-mobile/pull/1697): Increase ANDROID_OFFSET (#1697)
- [#1701](https://github.com/MetaMask/metamask-mobile/pull/1701): remove-zip-controllers (#1701)
- [#1684](https://github.com/MetaMask/metamask-mobile/pull/1684): Bugfix/speedup transactions (#1684)
- [#1698](https://github.com/MetaMask/metamask-mobile/pull/1698): bump eth-contract-metadata (#1698)
- [#1613](https://github.com/MetaMask/metamask-mobile/pull/1613): Feature/incoming token transactions (#1613)
- [#1657](https://github.com/MetaMask/metamask-mobile/pull/1657): update review function names (#1657)
- [#1693](https://github.com/MetaMask/metamask-mobile/pull/1693): PaymentRequest: fix conversion bug (#1693)
- [#1689](https://github.com/MetaMask/metamask-mobile/pull/1689): bugfix/approve screen (#1689)
- [#1690](https://github.com/MetaMask/metamask-mobile/pull/1690): Bugfix/release bugs (#1690)
- [#1676](https://github.com/MetaMask/metamask-mobile/pull/1676): Initiate url as well (#1676)
- [#1688](https://github.com/MetaMask/metamask-mobile/pull/1688): Support links (#1688)
- [#1683](https://github.com/MetaMask/metamask-mobile/pull/1683): @metamask/mobile-provider v1.2.4 (#1683)
- [#1573](https://github.com/MetaMask/metamask-mobile/pull/1573): Payment channel opt in (#1573)
- [#1679](https://github.com/MetaMask/metamask-mobile/pull/1679): Update yarn.lock (#1679)
- [#1671](https://github.com/MetaMask/metamask-mobile/pull/1671): Remove minWidth, fixes #1664 (#1671)
- [#1620](https://github.com/MetaMask/metamask-mobile/pull/1620): Dapp confirmation designs transitions (#1620)
- [#1559](https://github.com/MetaMask/metamask-mobile/pull/1559): Dapp Transaction Confirmation Re-designs (#1559)
- [#1605](https://github.com/MetaMask/metamask-mobile/pull/1605): Fix word election error in Spanish (#1605)
- [#1609](https://github.com/MetaMask/metamask-mobile/pull/1609): Feature/security third party api mode (#1609)
- [#1658](https://github.com/MetaMask/metamask-mobile/pull/1658): @metamask/mobile-provider v1.2.3 (#1658)
- [#1591](https://github.com/MetaMask/metamask-mobile/pull/1591): feature/sync imported accounts from extension (#1591)
- [#1645](https://github.com/MetaMask/metamask-mobile/pull/1645): Fix env vars (#1645)
- [#1649](https://github.com/MetaMask/metamask-mobile/pull/1649): remove sai message (#1649)
- [#1648](https://github.com/MetaMask/metamask-mobile/pull/1648): bump mobile provider (#1648)
- [#1643](https://github.com/MetaMask/metamask-mobile/pull/1643): Use @metamask/controllers@2.0.1 (#1643)
- [#1558](https://github.com/MetaMask/metamask-mobile/pull/1558): Complete redesigns for approval flow (#1558)
- [#1640](https://github.com/MetaMask/metamask-mobile/pull/1640): enable-apple-pay (#1640)

## v0.2.19 - Jun 29 2020
- [#1661](https://github.com/MetaMask/metamask-mobile/pull/1661): bugfix/Use eth gas API
- [#1653](https://github.com/MetaMask/metamask-mobile/pull/1653): Add ETH_GAS_STATION_API_KEY (#1653)

## v0.2.18 - Jun 15 2020
- [#1636](https://github.com/MetaMask/metamask-mobile/pull/1636): Add padding to CustomGas back button (#1636)
- [#1637](https://github.com/MetaMask/metamask-mobile/pull/1637): Bugfix/incoming notifications (#1637)
- [#1628](https://github.com/MetaMask/metamask-mobile/pull/1628): Fix network color indicator on transactionHeader for connect screens (#1628)

## v0.2.17 - Jun 12 2020

- [#1629](https://github.com/MetaMask/metamask-mobile/pull/1629): bugfix/custom gas modal (#1629)
- [#1625](https://github.com/MetaMask/metamask-mobile/pull/1625): Bugfix/wc connect on app closed (#1625)
- [#1624](https://github.com/MetaMask/metamask-mobile/pull/1624): Wallet connect update + Support for simple notifications (#1624)
- [#1623](https://github.com/MetaMask/metamask-mobile/pull/1623): Fix browser intial load (#1623)
- [#1621](https://github.com/MetaMask/metamask-mobile/pull/1621): Fix branch (#1621)
- [#1512](https://github.com/MetaMask/metamask-mobile/pull/1512): Transaction components (#1512)
- [#1619](https://github.com/MetaMask/metamask-mobile/pull/1619): Fix aab link on slack (#1619)
- [#1618](https://github.com/MetaMask/metamask-mobile/pull/1618): Fix android circleci (#1618)
- [#1578](https://github.com/MetaMask/metamask-mobile/pull/1578): Stops the unintended 'User Rejected...' error caused by buggy submitt… (#1578)
- [#1615](https://github.com/MetaMask/metamask-mobile/pull/1615): Android circleci fix (#1615)
- [#1554](https://github.com/MetaMask/metamask-mobile/pull/1554): Splash screen on android (#1554)
- [#1612](https://github.com/MetaMask/metamask-mobile/pull/1612): Update: add warningTextEmpty, closes #1610 (#1612)
- [#1560](https://github.com/MetaMask/metamask-mobile/pull/1560): Mixpanel migration (#1560)
- [#1606](https://github.com/MetaMask/metamask-mobile/pull/1606): Default to wallet when app re-opens (#1606)
- [#1608](https://github.com/MetaMask/metamask-mobile/pull/1608): remove log from TransactionNotification (#1608)
- [#1611](https://github.com/MetaMask/metamask-mobile/pull/1611): make detox great again (#1611)
- [#1514](https://github.com/MetaMask/metamask-mobile/pull/1514): Improvement/protect funds everywhere (#1514)
- [#1580](https://github.com/MetaMask/metamask-mobile/pull/1580): filter sentry tx rejected errors (#1580)
- [#1555](https://github.com/MetaMask/metamask-mobile/pull/1555): remove set timeouts (#1555)
- [#1604](https://github.com/MetaMask/metamask-mobile/pull/1604): Connect design qa (#1604)
- [#1602](https://github.com/MetaMask/metamask-mobile/pull/1602): Bugfix/rn upgrade circleci and e2e (#1602)
- [#1568](https://github.com/MetaMask/metamask-mobile/pull/1568): Fix browser initial loading performance (#1568)
- [#1601](https://github.com/MetaMask/metamask-mobile/pull/1601): Add overlayColor (#1601)
- [#1600](https://github.com/MetaMask/metamask-mobile/pull/1600): Fix circle ci and improve e2e (#1600)
- [#1599](https://github.com/MetaMask/metamask-mobile/pull/1599): Update @metamask/mobile-provider (#1599)
- [#1550](https://github.com/MetaMask/metamask-mobile/pull/1550): Bugfix/choose password lockout (#1550)
- [#1598](https://github.com/MetaMask/metamask-mobile/pull/1598): Use @metamask/controllers (#1598)
- [#1508](https://github.com/MetaMask/metamask-mobile/pull/1508): Connect Screen Designs (#1508)
- [#1577](https://github.com/MetaMask/metamask-mobile/pull/1577): Fix last two paste context issues on Android (#1577)
- [#1597](https://github.com/MetaMask/metamask-mobile/pull/1597): fix builds (#1597)
- [#1588](https://github.com/MetaMask/metamask-mobile/pull/1588): React native 0.62.1 libraries upgraded rebased (#1588)
- [#1586](https://github.com/MetaMask/metamask-mobile/pull/1586): React native upgrade 0.62.2 rebased (#1586)
- [#1590](https://github.com/MetaMask/metamask-mobile/pull/1590): Add CODEOWNERS (#1590)
- [#1584](https://github.com/MetaMask/metamask-mobile/pull/1584): make sign tests great again (#1584)

## v0.2.16 - May 15 2020
- [#1582](https://github.com/MetaMask/metamask-mobile/pull/1582): Instapay deposit navbar cancel (#1582)
- [#1570](https://github.com/MetaMask/metamask-mobile/pull/1570): Disable confirm screen edit button when no tokens of a payment request (#1570)
- [#1574](https://github.com/MetaMask/metamask-mobile/pull/1574): Ensure collectibles that use 'transfer' method show a fee in tx history list (#1574)
- [#1565](https://github.com/MetaMask/metamask-mobile/pull/1565): Fix validating of amount when sending a collectible (#1565)
- [#1572](https://github.com/MetaMask/metamask-mobile/pull/1572): Fix amount validation for large token payment requests (#1572)
- [#1561](https://github.com/MetaMask/metamask-mobile/pull/1561): V0.2.16 (#1561)
- [#1548](https://github.com/MetaMask/metamask-mobile/pull/1548): Use setTimeout hack (again) to get paste context in token search (#1548)
- [#1465](https://github.com/MetaMask/metamask-mobile/pull/1465): Make send flows consistent (#1465)
- [#1557](https://github.com/MetaMask/metamask-mobile/pull/1557): Fix day and month numbers in toDateFormat (#1557)
- [#1556](https://github.com/MetaMask/metamask-mobile/pull/1556): Fix settings everywhere (#1556)
- [#1552](https://github.com/MetaMask/metamask-mobile/pull/1552): Use gaba@1.11.0 (#1552)
- [#1493](https://github.com/MetaMask/metamask-mobile/pull/1493): Sig request design fixed (#1493)
- [#1517](https://github.com/MetaMask/metamask-mobile/pull/1517): Add new mobile provider (#1517)
- [#1539](https://github.com/MetaMask/metamask-mobile/pull/1539): Use "web-search" keyboardType on iOS (#1539)
- [#1538](https://github.com/MetaMask/metamask-mobile/pull/1538): Detect if site has been added to Favorites (#1538)
- [#1495](https://github.com/MetaMask/metamask-mobile/pull/1495): Feature/block screenshots (#1495)
- [#1487](https://github.com/MetaMask/metamask-mobile/pull/1487): Transaction Header Component (#1487)
- [#1475](https://github.com/MetaMask/metamask-mobile/pull/1475): Improvement/tx status notification (#1475)
- [#1544](https://github.com/MetaMask/metamask-mobile/pull/1544): Add settings to nav bar (#1544)
- [#1521](https://github.com/MetaMask/metamask-mobile/pull/1521): update docs link in readme (#1521)
- [#1545](https://github.com/MetaMask/metamask-mobile/pull/1545): bugfix/check for sai method (#1545)
- [#1524](https://github.com/MetaMask/metamask-mobile/pull/1524): Loosen nvmrc (#1524)

## v0.2.15 - May 1 2020
- [#1529](https://github.com/MetaMask/metamask-mobile/pull/1529): sentry android production (#1529)
- [#1528](https://github.com/MetaMask/metamask-mobile/pull/1528): Bugfix/sentry in circle ci (#1528)
- [#1527](https://github.com/MetaMask/metamask-mobile/pull/1527): env to production (#1527)
- [#1526](https://github.com/MetaMask/metamask-mobile/pull/1526): use release properties (#1526)
- [#1525](https://github.com/MetaMask/metamask-mobile/pull/1525): package version bump (#1525)
- [#1523](https://github.com/MetaMask/metamask-mobile/pull/1523): Bugfix/import private key (#1523)
- [#1522](https://github.com/MetaMask/metamask-mobile/pull/1522): Revert "Loosen nvmrc to major version (#1516)" (#1522)
- [#1516](https://github.com/MetaMask/metamask-mobile/pull/1516): Loosen nvmrc to major version (#1516)
- [#1518](https://github.com/MetaMask/metamask-mobile/pull/1518): V0.2.15 (#1518)
- [#1507](https://github.com/MetaMask/metamask-mobile/pull/1507): Bugfix/import account view (#1507)
- [#1453](https://github.com/MetaMask/metamask-mobile/pull/1453): Feature: analytics v2 (#1453)
- [#1481](https://github.com/MetaMask/metamask-mobile/pull/1481): bugfix/search-token (#1481)
- [#1494](https://github.com/MetaMask/metamask-mobile/pull/1494): improvement/async storage size (#1494)
- [#1472](https://github.com/MetaMask/metamask-mobile/pull/1472): Enable back button if going from dapp to home & redirection problems (#1472)
- [#1427](https://github.com/MetaMask/metamask-mobile/pull/1427): Change source commit for react-native-webview in package.json (#1427)
- [#1486](https://github.com/MetaMask/metamask-mobile/pull/1486): Delete accidentally pushed file (#1486)
- [#1482](https://github.com/MetaMask/metamask-mobile/pull/1482): Fix web3 injection (#1482)
- [#1477](https://github.com/MetaMask/metamask-mobile/pull/1477): update from latest changes (#1477)
- [#1470](https://github.com/MetaMask/metamask-mobile/pull/1470): Fix collectible image icon & send flow styles (#1470)
- [#1443](https://github.com/MetaMask/metamask-mobile/pull/1443): Set navigation param silent to false when switching to a tab (#1443)
- [#1438](https://github.com/MetaMask/metamask-mobile/pull/1438): Add bl to resolutions to fix vuln (#1438)
- [#1461](https://github.com/MetaMask/metamask-mobile/pull/1461): Update transaction fee selectors (#1461)
- [#1455](https://github.com/MetaMask/metamask-mobile/pull/1455): Approve design updates (#1455)
- [#1454](https://github.com/MetaMask/metamask-mobile/pull/1454): Trim white space from parsed (#1454)
- [#1460](https://github.com/MetaMask/metamask-mobile/pull/1460): Update lockfile (#1460)
- [#1458](https://github.com/MetaMask/metamask-mobile/pull/1458): Skip Sentry upload during iOS Debug build (#1458)
- [#1449](https://github.com/MetaMask/metamask-mobile/pull/1449): Use setTimeout hack to get paste context back (#1449)
- [#1450](https://github.com/MetaMask/metamask-mobile/pull/1450): Fix remove bookmark functionality, closes #1396 (#1450)
- [#1376](https://github.com/MetaMask/metamask-mobile/pull/1376): Replace Fabric Crashlytics with Sentry (#1376)
- [#1441](https://github.com/MetaMask/metamask-mobile/pull/1441): Detox: Address Book Tests  (#1441)
- [#1447](https://github.com/MetaMask/metamask-mobile/pull/1447): ci: Update CircleCI config version (#1447)
- [#1439](https://github.com/MetaMask/metamask-mobile/pull/1439): Update README.md (#1439)
- [#1436](https://github.com/MetaMask/metamask-mobile/pull/1436): Update mkdirp and minimist (#1436)
- [#1435](https://github.com/MetaMask/metamask-mobile/pull/1435): Use acorn@7.1.1 (#1435)
- [#1434](https://github.com/MetaMask/metamask-mobile/pull/1434): Use acorn@6.4.1 (#1434)
- [#1433](https://github.com/MetaMask/metamask-mobile/pull/1433): Use kind-of@6.0.3 (#1433)
- [#1422](https://github.com/MetaMask/metamask-mobile/pull/1422): Bump acorn from 5.7.3 to 5.7.4 (#1422)
- [#1432](https://github.com/MetaMask/metamask-mobile/pull/1432): bump eth contract metadata (#1432)
- [#1431](https://github.com/MetaMask/metamask-mobile/pull/1431): Update debugging instructions (#1431)
- [#1418](https://github.com/MetaMask/metamask-mobile/pull/1418): Improvement: remove addresslist comment (#1418)
- [#1425](https://github.com/MetaMask/metamask-mobile/pull/1425): Detox: Upate dapp-initated-txn tests (#1425)

## v0.2.14 - Mar 11 2020
- [#1413](https://github.com/MetaMask/metamask-mobile/pull/1413): Fix accountsChanged notification (#1413)
- [#1411](https://github.com/MetaMask/metamask-mobile/pull/1411): bugfix: payment request (#1411)
- [#1410](https://github.com/MetaMask/metamask-mobile/pull/1410): bugfix: ios close icon (#1410)
- [#1409](https://github.com/MetaMask/metamask-mobile/pull/1409): bugfix: wallet connect (#1409)
- [#1399](https://github.com/MetaMask/metamask-mobile/pull/1399): V0.2.14 (#1399)
- [#1398](https://github.com/MetaMask/metamask-mobile/pull/1398): Add vertical padding to close button (#1398)
- [#1384](https://github.com/MetaMask/metamask-mobile/pull/1384): Update `pubnub` dependency to match extension (#1384)
- [#1394](https://github.com/MetaMask/metamask-mobile/pull/1394): fix wallet tests (#1394)
- [#1397](https://github.com/MetaMask/metamask-mobile/pull/1397): fixes browser tests in release mode (#1397)
- [#1327](https://github.com/MetaMask/metamask-mobile/pull/1327): Improvement: send flow (#1327)
- [#1386](https://github.com/MetaMask/metamask-mobile/pull/1386): Remove Shapeshift controller (#1386)
- [#1385](https://github.com/MetaMask/metamask-mobile/pull/1385): Bump gaba minor (#1385)
- [#1338](https://github.com/MetaMask/metamask-mobile/pull/1338): Update docs, scripts (#1338)
- [#1380](https://github.com/MetaMask/metamask-mobile/pull/1380): Add padding to top and bottom of hamburgerButton (#1380)
- [#1372](https://github.com/MetaMask/metamask-mobile/pull/1372): bugfix: amount space crash (#1372)
- [#1337](https://github.com/MetaMask/metamask-mobile/pull/1337): Bugfix: duplicated word in seedphrase (#1337)
- [#1379](https://github.com/MetaMask/metamask-mobile/pull/1379): Fix mixed tabs and spaces (#1379)
- [#1378](https://github.com/MetaMask/metamask-mobile/pull/1378): Update test wording (#1378)
- [#1342](https://github.com/MetaMask/metamask-mobile/pull/1342): Device util update (#1342)
- [#1373](https://github.com/MetaMask/metamask-mobile/pull/1373): bugfix: amount switch no conversion (#1373)
- [#1322](https://github.com/MetaMask/metamask-mobile/pull/1322): Bugfix: send flow amount (#1322)
- [#1340](https://github.com/MetaMask/metamask-mobile/pull/1340): Fix faulty null checks (#1340)
- [#1333](https://github.com/MetaMask/metamask-mobile/pull/1333): Add padding to increase hit area in BrowserBottomBar (#1333)
- [#1307](https://github.com/MetaMask/metamask-mobile/pull/1307): Reorganize RPC middlewares; update mobile-provider (#1307)
- [#1306](https://github.com/MetaMask/metamask-mobile/pull/1306): Detox: Update for new send flow (#1306)
- [#1328](https://github.com/MetaMask/metamask-mobile/pull/1328): Update patch version (#1328)
- [#1313](https://github.com/MetaMask/metamask-mobile/pull/1313): Update font (#1313)
- [#1303](https://github.com/MetaMask/metamask-mobile/pull/1303): Link to support URLs using default browser, closes #1295 (#1303)
- [#1309](https://github.com/MetaMask/metamask-mobile/pull/1309): Use ethereum-ens-network-map@1.0.2 (#1309)
- [#1310](https://github.com/MetaMask/metamask-mobile/pull/1310): Update resolver.js (#1310)
- [#1251](https://github.com/MetaMask/metamask-mobile/pull/1251): Feature: approve screen (#1251)
- [#1305](https://github.com/MetaMask/metamask-mobile/pull/1305): add exception for localhost (#1305)
- [#1304](https://github.com/MetaMask/metamask-mobile/pull/1304): Use patch-package (#1304)
- [#1294](https://github.com/MetaMask/metamask-mobile/pull/1294): Bugfix: new send flow amount balance (#1294)
- [#1301](https://github.com/MetaMask/metamask-mobile/pull/1301): Add git submodule initialization to postinstall script (#1301)
- [#1239](https://github.com/MetaMask/metamask-mobile/pull/1239): Feature: address book + new send flow (#1239)
- [#1287](https://github.com/MetaMask/metamask-mobile/pull/1287): move showOptions to state (#1287)
- [#1285](https://github.com/MetaMask/metamask-mobile/pull/1285): Fix typo interal -> internal (#1285)
- [#1284](https://github.com/MetaMask/metamask-mobile/pull/1284): move pkgs to metamask org (#1284)
- [#1282](https://github.com/MetaMask/metamask-mobile/pull/1282): Fix iframe injection (#1282)
- [#1281](https://github.com/MetaMask/metamask-mobile/pull/1281): Added Architecture diagram (#1281)
- [#1279](https://github.com/MetaMask/metamask-mobile/pull/1279): Simplify build.sh control flow (#1279)
- [#1236](https://github.com/MetaMask/metamask-mobile/pull/1236): JSON RPC Engine (#1236)
- [#1277](https://github.com/MetaMask/metamask-mobile/pull/1277): check if CI before envFileMissing and exit 1 (#1277)
- [#1276](https://github.com/MetaMask/metamask-mobile/pull/1276): Improve onboarding (#1276)
- [#1275](https://github.com/MetaMask/metamask-mobile/pull/1275): bugfix: inpage bridge chainid (#1275)
- [#1263](https://github.com/MetaMask/metamask-mobile/pull/1263): Revert "increase circleci timeout (#1262)" (#1263)
- [#1262](https://github.com/MetaMask/metamask-mobile/pull/1262): increase circleci timeout (#1262)
- [#1258](https://github.com/MetaMask/metamask-mobile/pull/1258): Update iOS Builds (#1258)
- [#1252](https://github.com/MetaMask/metamask-mobile/pull/1252): Bugfix: cancel and speedup insufficient funds (#1252)

## v0.2.13 - Dic 30 2019
- [#1250](https://github.com/MetaMask/metamask-mobile/pull/1250): Bump excon from 0.64.0 to 0.71.0 in /ios (#1250)
- [#1246](https://github.com/MetaMask/metamask-mobile/pull/1246): bugfix: wizard back (#1246)
- [#1235](https://github.com/MetaMask/metamask-mobile/pull/1235): Detox: Request token flow (#1235)
- [#1234](https://github.com/MetaMask/metamask-mobile/pull/1234): bump migration version (#1234)

## v0.2.12 - Nov 25 2019
- [#1224](https://github.com/MetaMask/metamask-mobile/pull/1224): Bugfix: asset ens tx (#1224)
- [#1225](https://github.com/MetaMask/metamask-mobile/pull/1225): update bug report link (#1225)
- [#1215](https://github.com/MetaMask/metamask-mobile/pull/1215): Detox: Fix Android e2e Tests (#1215)
- [#1223](https://github.com/MetaMask/metamask-mobile/pull/1223): Bugfix: contract deployments (#1223)
- [#1222](https://github.com/MetaMask/metamask-mobile/pull/1222): bugfix: android show hex input instapay send (#1222)
- [#1214](https://github.com/MetaMask/metamask-mobile/pull/1214): pass  metametrics context to homepage (#1214)

## v0.2.11 - Nov 18 2019
- [#1212](https://github.com/MetaMask/metamask-mobile/pull/1212): Provider missing properties (#1212)
- [#1207](https://github.com/MetaMask/metamask-mobile/pull/1207): Fix typo on Import Account screen (#1207)
- [#1198](https://github.com/MetaMask/metamask-mobile/pull/1198): Migrate to SAI (#1198)

## v0.2.10 - Nov 16 2019
- [#1205](https://github.com/MetaMask/metamask-mobile/pull/1205): Disable speedup instapay (#1205)
- [#1204](https://github.com/MetaMask/metamask-mobile/pull/1204): Fix injection on Android (#1204)
- [#1203](https://github.com/MetaMask/metamask-mobile/pull/1203): Update support email (#1203)
- [#1199](https://github.com/MetaMask/metamask-mobile/pull/1199): Optimize injection on Iframes (#1199)
- [#1197](https://github.com/MetaMask/metamask-mobile/pull/1197): bump version of detox e2e (#1197)
- [#1196](https://github.com/MetaMask/metamask-mobile/pull/1196): Use v8 instead of JSC + native SVG support (#1196)
- [#1194](https://github.com/MetaMask/metamask-mobile/pull/1194): bump to xcode 11.2.1 (#1194)
- [#1189](https://github.com/MetaMask/metamask-mobile/pull/1189): version bump (#1189)
- [#1192](https://github.com/MetaMask/metamask-mobile/pull/1192): Bugfix: android general settings (#1192)
- [#1191](https://github.com/MetaMask/metamask-mobile/pull/1191): xcode bumps (#1191)
- [#1190](https://github.com/MetaMask/metamask-mobile/pull/1190): Revert "Add ruby version (#1165)" (#1190)
- [#1182](https://github.com/MetaMask/metamask-mobile/pull/1182): Bugfix: android exception manager crashes (#1182)
- [#1188](https://github.com/MetaMask/metamask-mobile/pull/1188): fix go back homepage and refresh favorites (#1188)
- [#1187](https://github.com/MetaMask/metamask-mobile/pull/1187): Bugfix: ENS links (#1187)
- [#1183](https://github.com/MetaMask/metamask-mobile/pull/1183): Fix bookmark updates (#1183)
- [#1176](https://github.com/MetaMask/metamask-mobile/pull/1176): Feature: speed up transaction (#1176)
- [#1179](https://github.com/MetaMask/metamask-mobile/pull/1179): Allow injection on iframes (#1179)
- [#1181](https://github.com/MetaMask/metamask-mobile/pull/1181): walletconnect deeplink support v2 (#1181)
- [#1173](https://github.com/MetaMask/metamask-mobile/pull/1173): Detox: update RPC Network flow (#1173)
- [#1172](https://github.com/MetaMask/metamask-mobile/pull/1172): added tests for custom rpc (#1172)
- [#1168](https://github.com/MetaMask/metamask-mobile/pull/1168): bugfix: login and password issues (#1168)
- [#1170](https://github.com/MetaMask/metamask-mobile/pull/1170): Detox: Wallet Tests (#1170)
- [#1165](https://github.com/MetaMask/metamask-mobile/pull/1165): Add ruby version (#1165)
- [#1155](https://github.com/MetaMask/metamask-mobile/pull/1155): Feature: sign typed v4 (#1155)
- [#1164](https://github.com/MetaMask/metamask-mobile/pull/1164): Add CircleCI Badge (#1164)
- [#1151](https://github.com/MetaMask/metamask-mobile/pull/1151): Feature: message eth sign + Address Book Migration (#1151)
- [#1148](https://github.com/MetaMask/metamask-mobile/pull/1148): added more assertions and beefed up onboarding wizard tests (#1148)
- [#1147](https://github.com/MetaMask/metamask-mobile/pull/1147): Detox: Browser Tests (#1147)
- [#1163](https://github.com/MetaMask/metamask-mobile/pull/1163): update eslint to the latest version (#1163)
- [#1162](https://github.com/MetaMask/metamask-mobile/pull/1162): disabled e2e tests (#1162)
- [#1156](https://github.com/MetaMask/metamask-mobile/pull/1156): Fix linter on CI (#1156)
- [#1146](https://github.com/MetaMask/metamask-mobile/pull/1146): fix instapay logs app version (#1146)

## v0.2.8 - Oct 9 2019
- [#1145](https://github.com/MetaMask/metamask-mobile/pull/1145): Support URLs on QR code scanner (#1145)

## v0.2.7 - Oct 7 2019
- [#1143](https://github.com/MetaMask/metamask-mobile/pull/1143): Minor bugfixes (#1143)

## v0.2.6 - Oct 4 2019
- [#1139](https://github.com/MetaMask/metamask-mobile/pull/1139): Fix onboarding carousel dimensions (#1139)

## v0.2.5 - Oct 4 2019

- [#1136](https://github.com/MetaMask/metamask-mobile/pull/1136): Select correct profiles (#1136)
- [#1135](https://github.com/MetaMask/metamask-mobile/pull/1135): Fix fastlane config (#1135)
- [#1134](https://github.com/MetaMask/metamask-mobile/pull/1134): renew certs if needed (#1134)
- [#1132](https://github.com/MetaMask/metamask-mobile/pull/1132): Fix animated fox (#1132)
- [#1131](https://github.com/MetaMask/metamask-mobile/pull/1131): Bugfix: wizard design qa (#1131)
- [#1130](https://github.com/MetaMask/metamask-mobile/pull/1130): Bugfix: onboarding design qa (#1130)
- [#1129](https://github.com/MetaMask/metamask-mobile/pull/1129): Design QA issues (#1129)
- [#1128](https://github.com/MetaMask/metamask-mobile/pull/1128): Navigation fixes (#1128)
- [#1127](https://github.com/MetaMask/metamask-mobile/pull/1127): Fix: Add tokens android crash (#1127)
- [#1125](https://github.com/MetaMask/metamask-mobile/pull/1125): update user agents (#1125)
- [#1124](https://github.com/MetaMask/metamask-mobile/pull/1124): fix apk generation (#1124)
- [#1123](https://github.com/MetaMask/metamask-mobile/pull/1123): Support provider.once (#1123)
- [#1122](https://github.com/MetaMask/metamask-mobile/pull/1122): fix statusbar in dark mode (#1122)
- [#1121](https://github.com/MetaMask/metamask-mobile/pull/1121): Fix walletconnect sendTransaction (#1121)
- [#1120](https://github.com/MetaMask/metamask-mobile/pull/1120): fix webview black flash (#1120)
- [#1119](https://github.com/MetaMask/metamask-mobile/pull/1119): Bump rubyzip from 1.2.3 to 1.3.0 in /ios (#1119)
- [#1116](https://github.com/MetaMask/metamask-mobile/pull/1116): iOS 13 Support (#1116)
- [#1115](https://github.com/MetaMask/metamask-mobile/pull/1115): Bump react-native-device-info (#1115)
- [#1113](https://github.com/MetaMask/metamask-mobile/pull/1113): Fix develop builds (#1113)
- [#1112](https://github.com/MetaMask/metamask-mobile/pull/1112): bump to v0.2.5 (#1112)
- [#1096](https://github.com/MetaMask/metamask-mobile/pull/1096): Webview rewrite (#1096)
- [#1108](https://github.com/MetaMask/metamask-mobile/pull/1108): improvements: instapay (#1108)
- [#1104](https://github.com/MetaMask/metamask-mobile/pull/1104): Feature: instapay receive (#1104)
- [#1103](https://github.com/MetaMask/metamask-mobile/pull/1103): Feature: onboarding carousel (#1103)
- [#1106](https://github.com/MetaMask/metamask-mobile/pull/1106): Update README.md (#1106)
- [#1101](https://github.com/MetaMask/metamask-mobile/pull/1101): update dapp txn flow in case ropsten faucet is having issues (#1101)
- [#1075](https://github.com/MetaMask/metamask-mobile/pull/1075): detox: test e2e ios (#1075)
- [#1097](https://github.com/MetaMask/metamask-mobile/pull/1097): detox: Enable e2e test suite to run on CircleCI (#1097)
- [#1094](https://github.com/MetaMask/metamask-mobile/pull/1094): update deps and xcode (#1094)
- [#1093](https://github.com/MetaMask/metamask-mobile/pull/1093): fix Crashlytics import (#1093)
- [#1092](https://github.com/MetaMask/metamask-mobile/pull/1092): use old xcode to compare build diff (#1092)
- [#1091](https://github.com/MetaMask/metamask-mobile/pull/1091): fix android apk generation (#1091)
- [#1090](https://github.com/MetaMask/metamask-mobile/pull/1090): Revert "Update branch to latest version (#1078)" (#1090)
- [#1089](https://github.com/MetaMask/metamask-mobile/pull/1089): Revert "update submodules (#1079)" (#1089)
- [#1088](https://github.com/MetaMask/metamask-mobile/pull/1088): Revert "Fix android builds (#1080)" (#1088)
- [#1087](https://github.com/MetaMask/metamask-mobile/pull/1087): Revert "Fix webview files path (#1081)" (#1087)
- [#1086](https://github.com/MetaMask/metamask-mobile/pull/1086): Revert "dont use cache on pre-release (#1082)" (#1086)
- [#1084](https://github.com/MetaMask/metamask-mobile/pull/1084): bugfix: reveal credential ui (#1084)
- [#1082](https://github.com/MetaMask/metamask-mobile/pull/1082): dont use cache on pre-release (#1082)
- [#1081](https://github.com/MetaMask/metamask-mobile/pull/1081): Fix webview files path (#1081)
- [#1080](https://github.com/MetaMask/metamask-mobile/pull/1080): Fix android builds (#1080)
- [#1079](https://github.com/MetaMask/metamask-mobile/pull/1079): update submodules (#1079)
- [#1078](https://github.com/MetaMask/metamask-mobile/pull/1078): Update branch to latest version (#1078)
- [#1076](https://github.com/MetaMask/metamask-mobile/pull/1076): safe check (#1076)
- [#1058](https://github.com/MetaMask/metamask-mobile/pull/1058): detox: dapp initiated txns (#1058)
- [#1071](https://github.com/MetaMask/metamask-mobile/pull/1071): bugfix: json rpc accounts api (#1071)
- [#1069](https://github.com/MetaMask/metamask-mobile/pull/1069): fix ens manager (#1069)
- [#1068](https://github.com/MetaMask/metamask-mobile/pull/1068): bugfix: android injection (#1068)
- [#1060](https://github.com/MetaMask/metamask-mobile/pull/1060): Bugfix: custom rpc network (#1060)
- [#1065](https://github.com/MetaMask/metamask-mobile/pull/1065): bugfix: inpage enable (#1065)
- [#1054](https://github.com/MetaMask/metamask-mobile/pull/1054): bugfix: remove tokens but ETH (#1054)
- [#1064](https://github.com/MetaMask/metamask-mobile/pull/1064): Fix circleci builds (#1064)
- [#1063](https://github.com/MetaMask/metamask-mobile/pull/1063): Revert "Update branch SDK & fix build issues (#1061)" (#1063)
- [#1062](https://github.com/MetaMask/metamask-mobile/pull/1062): bump circleci cache version (#1062)
- [#1061](https://github.com/MetaMask/metamask-mobile/pull/1061): Update branch SDK & fix build issues (#1061)
- [#1056](https://github.com/MetaMask/metamask-mobile/pull/1056): Detox: Import seed phrase and validate via settings (#1056)
- [#1051](https://github.com/MetaMask/metamask-mobile/pull/1051): updated branch sdk and fix build (#1051)
- [#1050](https://github.com/MetaMask/metamask-mobile/pull/1050): dont show invalid deeplink if opening the app with no action (#1050)
- [#1048](https://github.com/MetaMask/metamask-mobile/pull/1048): bugfix: connect modal (#1048)
- [#1047](https://github.com/MetaMask/metamask-mobile/pull/1047): bugfix: token transfer deeplink (#1047)
- [#1049](https://github.com/MetaMask/metamask-mobile/pull/1049): Migrate to yarn (#1049)
- [#1045](https://github.com/MetaMask/metamask-mobile/pull/1045): More UIWebview cleanup (#1045)
- [#1044](https://github.com/MetaMask/metamask-mobile/pull/1044): remove uiwebview ocurrences (#1044)

## v0.2.4 - Aug 28 2019
- [#1038](https://github.com/MetaMask/metamask-mobile/pull/1038): Fix Approval (#1038)
: [#1037](https://github.com/MetaMask/metamask-mobile/pull/1037): Fix walletconnect :#1037)
- [#1036](https://github.com/MetaMask/metamask-mobile/pull/1036): Bugfix: browser crash (#1036)
- [#1034](https://github.com/MetaMask/metamask-mobile/pull/1034): Bump 0.2.4 (#1034)
- [#1027](https://github.com/MetaMask/metamask-mobile/pull/1027): Improvement: approval token transfer data (#1027)
- [#1028](https://github.com/MetaMask/metamask-mobile/pull/1028): fix no password logged out scenario (#1028)
- [#1030](https://github.com/MetaMask/metamask-mobile/pull/1030): Allow to import / export Pkey & seed phrase via QR Codes (#1030)
- [#1021](https://github.com/MetaMask/metamask-mobile/pull/1021): bugfix: fix dapp compat issues (#1021)
- [#1007](https://github.com/MetaMask/metamask-mobile/pull/1007): Bugfix: phishing alerts (#1007)
- [#1023](https://github.com/MetaMask/metamask-mobile/pull/1023): Fix forkdelta.app (#1023)
- [#1017](https://github.com/MetaMask/metamask-mobile/pull/1017): Allow ENS available TLDs that are not ENS names (#1017)
- [#1016](https://github.com/MetaMask/metamask-mobile/pull/1016): update copy on account import (#1016)
- [#1014](https://github.com/MetaMask/metamask-mobile/pull/1014): Upgrade to node 10 and gaba 1.6.0 (#1014)
- [#1013](https://github.com/MetaMask/metamask-mobile/pull/1013): add auto-changelog (#1013)
- [#1005](https://github.com/MetaMask/metamask-mobile/pull/1005): bugfix: block ERC721 on sync (#1005)
- [#1009](https://github.com/MetaMask/metamask-mobile/pull/1009): Bugfix: Allow file uploads on android (#1009)
- [#1008](https://github.com/MetaMask/metamask-mobile/pull/1008): bump walletconnect (#1008)

## v0.2.3 - Aug 19 2019
- [#972](https://github.com/MetaMask/metamask-mobile/pull/972): bump version (#972)
- [#989](https://github.com/MetaMask/metamask-mobile/pull/989): Bugfix: Fix mobile sync & Security options (#989)
- [#1000](https://github.com/MetaMask/metamask-mobile/pull/1000): bugfix: tx edit dropdowns in small devices (#1000)
- [#999](https://github.com/MetaMask/metamask-mobile/pull/999): bugfix: homepage back (#999)
- [#997](https://github.com/MetaMask/metamask-mobile/pull/997): Feature: ERC20 approve (#997)
- [#992](https://github.com/MetaMask/metamask-mobile/pull/992): Feature: instapay global currency (#992)
- [#995](https://github.com/MetaMask/metamask-mobile/pull/995): Feature: transfer approval (#995)
- [#991](https://github.com/MetaMask/metamask-mobile/pull/991): feature: sync tokens (#991)
- [#976](https://github.com/MetaMask/metamask-mobile/pull/976): Bugfix: onboarding analytics (#976)
- [#984](https://github.com/MetaMask/metamask-mobile/pull/984): Bugfix: bowser bottom bar navigation (#984)
- [#993](https://github.com/MetaMask/metamask-mobile/pull/993): bugfix: collectibles detection (#993)
- [#974](https://github.com/MetaMask/metamask-mobile/pull/974): Bugfix: lower priority android crashes (#974)
- [#990](https://github.com/MetaMask/metamask-mobile/pull/990): add missing privacy usage keys (#990)
- [#970](https://github.com/MetaMask/metamask-mobile/pull/970): Reverse ENS caching (#970)
- [#973](https://github.com/MetaMask/metamask-mobile/pull/973): Bugfix: android tx list crashes (#973)
- [#971](https://github.com/MetaMask/metamask-mobile/pull/971): remove unused tests (#971)
- [#937](https://github.com/MetaMask/metamask-mobile/pull/937): New user and tutorial e2e tests (#937)
- [#968](https://github.com/MetaMask/metamask-mobile/pull/968): Bugfix: ExceptionsManagerModule android crashes (#968)
- [#969](https://github.com/MetaMask/metamask-mobile/pull/969): Support reverse ens names in tx detail (#969)
- [#966](https://github.com/MetaMask/metamask-mobile/pull/966): Network name crash (#966)
- [#965](https://github.com/MetaMask/metamask-mobile/pull/965): safe connext client stop (#965)
- [#967](https://github.com/MetaMask/metamask-mobile/pull/967): dont crash if no tx id (#967)
- [#960](https://github.com/MetaMask/metamask-mobile/pull/960): bugfix: instapay notifications amount (#960)
- [#963](https://github.com/MetaMask/metamask-mobile/pull/963): Retry ethereum.enable after 1 sec if bridge not ready (#963)
- [#958](https://github.com/MetaMask/metamask-mobile/pull/958): bugfix: handle qrscanner camera permission (#958)
- [#956](https://github.com/MetaMask/metamask-mobile/pull/956): bugfix: remove collectible after sending if not in mainnet (#956)
- [#955](https://github.com/MetaMask/metamask-mobile/pull/955): dont ignore calls while initial reload (#955)
- [#957](https://github.com/MetaMask/metamask-mobile/pull/957): fix timeouts (#957)
- [#954](https://github.com/MetaMask/metamask-mobile/pull/954): Bugfix: onboarding navigation (#954)
