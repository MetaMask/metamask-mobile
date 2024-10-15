# Missing Test Cases in Engine.test.ts

## 1. API Exposure Test
- Test name: "should expose an API"
- Checks for the presence of various controllers in the engine context
- List of controllers to check:
  - AccountTrackerController
  - AddressBookController
  - AssetsContractController
  - TokenListController
  - TokenDetectionController
  - NftDetectionController
  - NftController
  - CurrencyRateController
  - KeyringController
  - NetworkController
  - PhishingController
  - PreferencesController
  - SignatureController
  - TokenBalancesController
  - TokenRatesController
  - TokensController
  - LoggingController
  - TransactionController
  - SmartTransactionsController
  - AuthenticationController
  - UserStorageController
  - NotificationServicesController
  - SelectedNetworkController

## 2. Engine Instance Tests
- Test name: "calling Engine.init twice returns the same instance"
- Test name: "calling Engine.destroy deletes the old instance"

## 3. Initial State Fixture Test
- Test name: "matches initial state fixture"
- Compares engine.datamodel.state with backgroundState

## 4. Invalid Selected Address Test
- Test name: "throws when setting invalid selected address"
- Needs correction in TypeScript implementation

## 5. getTotalFiatAccountBalance Tests
- Describe block: "getTotalFiatAccountBalance"
  a. Test name: "returns zero balances when there are no balances"
     - Needs correction in TypeScript implementation
  b. Test name: "calculates when theres only ETH"
     - Includes ETH balance and price change calculations
  c. Test name: "calculates when there are ETH and tokens"
     - Includes calculations for both ETH and token balances and price changes

## Notes for Restoration
- Ensure type safety when restoring these tests
- Use appropriate TypeScript syntax and type annotations
- Maintain the original test logic and assertions
- Update any necessary mock data or state to match TypeScript types
