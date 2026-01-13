//
//  IntentHandler.swift
//  BalanceWidget
//
//  Handles the account selection intent for widget configuration
//

import Intents

class IntentHandler: INExtension, SelectAccountIntentHandling {
    
    // MARK: - SelectAccountIntentHandling
    
    func provideAccountOptionsCollection(
        for intent: SelectAccountIntent,
        with completion: @escaping (INObjectCollection<WalletAccount>?, Error?) -> Void
    ) {
        let dataManager = WidgetDataManager.shared
        
        guard let accounts = dataManager.getAccounts(), !accounts.isEmpty else {
            // Return empty collection if no accounts
            completion(INObjectCollection(items: []), nil)
            return
        }
        
        // Convert WidgetAccount to WalletAccount (Intent type)
        let walletAccounts = accounts.map { account -> WalletAccount in
            let walletAccount = WalletAccount(
                identifier: account.id,
                display: account.displayName
            )
            walletAccount.accountName = account.name
            walletAccount.address = account.address
            return walletAccount
        }
        
        let collection = INObjectCollection(items: walletAccounts)
        completion(collection, nil)
    }
    
    func defaultAccount(for intent: SelectAccountIntent) -> WalletAccount? {
        let dataManager = WidgetDataManager.shared
        
        guard let accounts = dataManager.getAccounts(), let firstAccount = accounts.first else {
            return nil
        }
        
        let walletAccount = WalletAccount(
            identifier: firstAccount.id,
            display: firstAccount.displayName
        )
        walletAccount.accountName = firstAccount.name
        walletAccount.address = firstAccount.address
        
        return walletAccount
    }
    
    func resolveAccount(
        for intent: SelectAccountIntent,
        with completion: @escaping (WalletAccountResolutionResult) -> Void
    ) {
        guard let account = intent.account else {
            // If no account selected, try to use default
            if let defaultAccount = defaultAccount(for: intent) {
                completion(.success(with: defaultAccount))
            } else {
                completion(.needsValue())
            }
            return
        }
        
        completion(.success(with: account))
    }
    
    override func handler(for intent: INIntent) -> Any {
        return self
    }
}

