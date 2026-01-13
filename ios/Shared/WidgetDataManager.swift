//
//  WidgetDataManager.swift
//  MetaMask
//
//  Manages shared data between the main app and widgets using App Groups
//

import Foundation

// MARK: - App Group Configuration
struct AppGroupConfig {
    // This App Group identifier must match what's configured in both the main app
    // and widget extension entitlements
    static let identifier = "group.io.metamask.wallet"
    
    // Keys for UserDefaults
    static let accountsKey = "widget_accounts"
    static let balancesKey = "widget_balances"
    static let currencyKey = "widget_currency"
    static let lastUpdateKey = "widget_last_update"
}

// MARK: - Widget Account Model
struct WidgetAccount: Codable, Identifiable {
    let id: String
    let name: String
    let address: String
    let type: String // "eoa", "smart", etc.
    
    var displayName: String {
        return name.isEmpty ? formatAddress(address) : name
    }
    
    private func formatAddress(_ address: String) -> String {
        guard address.count > 10 else { return address }
        let prefix = String(address.prefix(6))
        let suffix = String(address.suffix(4))
        return "\(prefix)...\(suffix)"
    }
}

// MARK: - Widget Balance Model
struct WidgetBalance: Codable {
    let accountId: String
    let totalFiatBalance: Double
    let currency: String
    let lastUpdated: Date
    
    var formattedBalance: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.maximumFractionDigits = 2
        formatter.minimumFractionDigits = 2
        
        if let formatted = formatter.string(from: NSNumber(value: totalFiatBalance)) {
            return formatted
        }
        
        // Fallback formatting
        return String(format: "%@ %.2f", currencySymbol, totalFiatBalance)
    }
    
    private var currencySymbol: String {
        switch currency.uppercased() {
        case "USD": return "$"
        case "EUR": return "€"
        case "GBP": return "£"
        case "JPY": return "¥"
        default: return currency
        }
    }
}

// MARK: - Widget Data Manager
class WidgetDataManager {
    static let shared = WidgetDataManager()
    
    private let userDefaults: UserDefaults?
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    
    private init() {
        userDefaults = UserDefaults(suiteName: AppGroupConfig.identifier)
        
        if userDefaults == nil {
            print("⚠️ WidgetDataManager: Failed to access App Group UserDefaults")
        }
    }
    
    // MARK: - Accounts
    
    /// Saves accounts to shared storage
    func saveAccounts(_ accounts: [WidgetAccount]) {
        guard let userDefaults = userDefaults else { return }
        
        do {
            let data = try encoder.encode(accounts)
            userDefaults.set(data, forKey: AppGroupConfig.accountsKey)
            userDefaults.set(Date(), forKey: AppGroupConfig.lastUpdateKey)
            userDefaults.synchronize()
            print("✅ WidgetDataManager: Saved \(accounts.count) accounts")
        } catch {
            print("❌ WidgetDataManager: Failed to save accounts: \(error)")
        }
    }
    
    /// Retrieves accounts from shared storage
    func getAccounts() -> [WidgetAccount]? {
        guard let userDefaults = userDefaults,
              let data = userDefaults.data(forKey: AppGroupConfig.accountsKey) else {
            return nil
        }
        
        do {
            let accounts = try decoder.decode([WidgetAccount].self, from: data)
            return accounts
        } catch {
            print("❌ WidgetDataManager: Failed to decode accounts: \(error)")
            return nil
        }
    }
    
    // MARK: - Balances
    
    /// Saves balances to shared storage
    func saveBalances(_ balances: [WidgetBalance]) {
        guard let userDefaults = userDefaults else { return }
        
        do {
            let data = try encoder.encode(balances)
            userDefaults.set(data, forKey: AppGroupConfig.balancesKey)
            userDefaults.synchronize()
            print("✅ WidgetDataManager: Saved \(balances.count) balances")
        } catch {
            print("❌ WidgetDataManager: Failed to save balances: \(error)")
        }
    }
    
    /// Retrieves balance for a specific account
    func getBalance(for accountId: String) -> WidgetBalance? {
        guard let userDefaults = userDefaults,
              let data = userDefaults.data(forKey: AppGroupConfig.balancesKey) else {
            return nil
        }
        
        do {
            let balances = try decoder.decode([WidgetBalance].self, from: data)
            return balances.first { $0.accountId == accountId }
        } catch {
            print("❌ WidgetDataManager: Failed to decode balances: \(error)")
            return nil
        }
    }
    
    /// Retrieves all balances from shared storage
    func getAllBalances() -> [WidgetBalance]? {
        guard let userDefaults = userDefaults,
              let data = userDefaults.data(forKey: AppGroupConfig.balancesKey) else {
            return nil
        }
        
        do {
            let balances = try decoder.decode([WidgetBalance].self, from: data)
            return balances
        } catch {
            print("❌ WidgetDataManager: Failed to decode balances: \(error)")
            return nil
        }
    }
    
    // MARK: - Currency
    
    /// Saves the user's preferred currency
    func saveCurrency(_ currency: String) {
        userDefaults?.set(currency, forKey: AppGroupConfig.currencyKey)
        userDefaults?.synchronize()
    }
    
    /// Retrieves the user's preferred currency
    func getCurrency() -> String {
        return userDefaults?.string(forKey: AppGroupConfig.currencyKey) ?? "USD"
    }
    
    // MARK: - Last Update
    
    /// Gets the last update timestamp
    func getLastUpdate() -> Date? {
        return userDefaults?.object(forKey: AppGroupConfig.lastUpdateKey) as? Date
    }
    
    // MARK: - Clear Data
    
    /// Clears all widget data (useful for logout)
    func clearAllData() {
        userDefaults?.removeObject(forKey: AppGroupConfig.accountsKey)
        userDefaults?.removeObject(forKey: AppGroupConfig.balancesKey)
        userDefaults?.removeObject(forKey: AppGroupConfig.currencyKey)
        userDefaults?.removeObject(forKey: AppGroupConfig.lastUpdateKey)
        userDefaults?.synchronize()
        print("✅ WidgetDataManager: Cleared all widget data")
    }
}

// MARK: - Convenience Extensions
extension WidgetDataManager {
    /// Updates a single account's balance
    func updateBalance(accountId: String, balance: Double, currency: String) {
        var balances = getAllBalances() ?? []
        
        // Remove existing balance for this account
        balances.removeAll { $0.accountId == accountId }
        
        // Add new balance
        let newBalance = WidgetBalance(
            accountId: accountId,
            totalFiatBalance: balance,
            currency: currency,
            lastUpdated: Date()
        )
        balances.append(newBalance)
        
        saveBalances(balances)
    }
    
    /// Batch update accounts and balances
    func batchUpdate(accounts: [WidgetAccount], balances: [WidgetBalance]) {
        saveAccounts(accounts)
        saveBalances(balances)
    }
}

