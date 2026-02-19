import {
  AccountTrackerControllerState,
  CurrencyRateState,
  NftControllerState,
  TokenListState,
  TokenRatesControllerState,
  TokensControllerState,
  TokenBalancesControllerState,
} from '@metamask/assets-controllers';
import SwapsController from '@metamask/swaps-controller';
import { NetworkState } from '@metamask/network-controller';
import { AddressBookControllerState } from '@metamask/address-book-controller';
import { KeyringControllerMemState } from '@metamask/keyring-controller';
import { PreferencesState } from '@metamask/preferences-controller';
import { PhishingControllerState } from '@metamask/phishing-controller';
import { RampsControllerState } from '@metamask/ramps-controller';
import { TransactionControllerState } from '@metamask/transaction-controller';
import { GasFeeController } from '@metamask/gas-fee-controller';
import { ApprovalControllerState } from '@metamask/approval-controller';
import { AccountsControllerState } from '@metamask/accounts-controller';
import { AccountTreeControllerState } from '@metamask/account-tree-controller';
///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
import { SnapController } from '@metamask/snaps-controllers';
///: END:ONLY_INCLUDE_IF

export interface EngineState {
  engine: {
    backgroundState: {
      AccountTrackerController: AccountTrackerControllerState;
      AddressBookController: AddressBookControllerState;
      NftController: NftControllerState;
      TokenListController: TokenListState;
      CurrencyRateController: CurrencyRateState;
      KeyringController: KeyringControllerMemState;
      NetworkController: NetworkState;
      PreferencesController: PreferencesState;
      PhishingController: PhishingControllerState;
      RampsController: RampsControllerState;
      TokenBalancesController: TokenBalancesControllerState;
      TokenRatesController: TokenRatesControllerState;
      TransactionController: TransactionControllerState;
      SwapsController: SwapsController;
      ///: BEGIN:ONLY_INCLUDE_IF(preinstalled-snaps,external-snaps)
      SnapController: SnapController;
      ///: END:ONLY_INCLUDE_IF
      GasFeeController: GasFeeController;
      TokensController: TokensControllerState;
      ApprovalController: ApprovalControllerState;
      AccountsController: AccountsControllerState;
      AccountTreeController: AccountTreeControllerState;
    };
  };
}
