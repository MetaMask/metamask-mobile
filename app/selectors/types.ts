import {
  AccountTrackerState,
  CurrencyRateState,
  NftDetectionController,
  NftState,
  TokenDetectionController,
  TokenListState,
  TokenRatesState,
  TokensState,
  TokenBalancesControllerState,
} from '@metamask/assets-controllers';
import SwapsController from '@metamask/swaps-controller';
import { NetworkState } from '@metamask/network-controller';
import { AddressBookState } from '@metamask/address-book-controller';
import { BaseState } from '@metamask/base-controller';
import { KeyringControllerMemState } from '@metamask/keyring-controller';
import { PreferencesState } from '@metamask/preferences-controller';
import { PhishingControllerState } from '@metamask/phishing-controller';
import { TransactionState } from '@metamask/transaction-controller';
import { GasFeeController } from '@metamask/gas-fee-controller';
import { PPOMState } from '@metamask/ppom-validator';
import { ApprovalControllerState } from '@metamask/approval-controller';
import { AccountsControllerState } from '@metamask/accounts-controller';
///: BEGIN:ONLY_INCLUDE_IF(snaps)
import { SnapController } from '@metamask/snaps-controllers';
///: END:ONLY_INCLUDE_IF
export interface EngineState {
  engine: {
    backgroundState: {
      AccountTrackerController: AccountTrackerState;
      AddressBookController: AddressBookState;
      AssetsContractController: BaseState;
      NftController: NftState;
      TokenListController: TokenListState;
      CurrencyRateController: CurrencyRateState;
      KeyringController: KeyringControllerMemState;
      NetworkController: NetworkState;
      PreferencesController: PreferencesState;
      PhishingController: PhishingControllerState;
      PPOMController: PPOMState;
      TokenBalancesController: TokenBalancesControllerState;
      TokenRatesController: TokenRatesState;
      TransactionController: TransactionState;
      SwapsController: SwapsController;
      ///: BEGIN:ONLY_INCLUDE_IF(snaps)
      SnapController: SnapController;
      ///: END:ONLY_INCLUDE_IF
      GasFeeController: GasFeeController;
      TokensController: TokensState;
      TokenDetectionController: TokenDetectionController;
      NftDetectionController: NftDetectionController;
      ApprovalController: ApprovalControllerState;
      AccountsController: AccountsControllerState;
    };
  };
}
