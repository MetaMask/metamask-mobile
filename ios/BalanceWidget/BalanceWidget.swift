//
//  BalanceWidget.swift
//  BalanceWidget
//
//  MetaMask iOS Balance Widget - Displays aggregated account balance
//

import WidgetKit
import SwiftUI
import Intents

// MARK: - Widget Entry
struct BalanceEntry: TimelineEntry {
    let date: Date
    let configuration: SelectAccountIntent
    let accountName: String
    let accountAddress: String
    let balance: String
    let currency: String
    let lastUpdated: Date
    let isPlaceholder: Bool
    
    static var placeholder: BalanceEntry {
        BalanceEntry(
            date: Date(),
            configuration: SelectAccountIntent(),
            accountName: "Account 1",
            accountAddress: "0x1234...5678",
            balance: "$1,234.56",
            currency: "USD",
            lastUpdated: Date(),
            isPlaceholder: true
        )
    }
    
    static var noData: BalanceEntry {
        BalanceEntry(
            date: Date(),
            configuration: SelectAccountIntent(),
            accountName: "No Account",
            accountAddress: "",
            balance: "--",
            currency: "USD",
            lastUpdated: Date(),
            isPlaceholder: false
        )
    }
}

// MARK: - Timeline Provider
struct BalanceTimelineProvider: IntentTimelineProvider {
    typealias Entry = BalanceEntry
    typealias Intent = SelectAccountIntent
    
    func placeholder(in context: Context) -> BalanceEntry {
        return .placeholder
    }
    
    func getSnapshot(for configuration: SelectAccountIntent, in context: Context, completion: @escaping (BalanceEntry) -> Void) {
        if context.isPreview {
            completion(.placeholder)
            return
        }
        
        let entry = getEntry(for: configuration)
        completion(entry)
    }
    
    func getTimeline(for configuration: SelectAccountIntent, in context: Context, completion: @escaping (Timeline<BalanceEntry>) -> Void) {
        let entry = getEntry(for: configuration)
        
        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        
        completion(timeline)
    }
    
    private func getEntry(for configuration: SelectAccountIntent) -> BalanceEntry {
        let dataManager = WidgetDataManager.shared
        
        // Get selected account from configuration or use first available
        let selectedAccountId = configuration.account?.identifier
        
        guard let accounts = dataManager.getAccounts(), !accounts.isEmpty else {
            return .noData
        }
        
        // Find the selected account or default to first
        let account: WidgetAccount
        if let selectedId = selectedAccountId,
           let found = accounts.first(where: { $0.id == selectedId }) {
            account = found
        } else {
            account = accounts[0]
        }
        
        // Get balance for this account
        let balanceInfo = dataManager.getBalance(for: account.id)
        
        return BalanceEntry(
            date: Date(),
            configuration: configuration,
            accountName: account.name,
            accountAddress: formatAddress(account.address),
            balance: balanceInfo?.formattedBalance ?? "--",
            currency: balanceInfo?.currency ?? "USD",
            lastUpdated: balanceInfo?.lastUpdated ?? Date(),
            isPlaceholder: false
        )
    }
    
    private func formatAddress(_ address: String) -> String {
        guard address.count > 10 else { return address }
        let prefix = String(address.prefix(6))
        let suffix = String(address.suffix(4))
        return "\(prefix)...\(suffix)"
    }
}

// MARK: - Widget Views
struct BalanceWidgetEntryView: View {
    var entry: BalanceEntry
    @Environment(\.widgetFamily) var family
    
    var body: some View {
        switch family {
        case .systemSmall:
            SmallBalanceView(entry: entry)
        case .systemMedium:
            MediumBalanceView(entry: entry)
        case .systemLarge:
            LargeBalanceView(entry: entry)
        case .accessoryCircular:
            CircularBalanceView(entry: entry)
        case .accessoryRectangular:
            RectangularBalanceView(entry: entry)
        case .accessoryInline:
            InlineBalanceView(entry: entry)
        @unknown default:
            SmallBalanceView(entry: entry)
        }
    }
}

// MARK: - Small Widget View
struct SmallBalanceView: View {
    let entry: BalanceEntry
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.13, green: 0.13, blue: 0.15),
                    Color(red: 0.08, green: 0.08, blue: 0.10)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(alignment: .leading, spacing: 8) {
                // MetaMask logo and account name
                HStack {
                    Image(systemName: "wallet.pass.fill")
                        .foregroundColor(.orange)
                        .font(.system(size: 16, weight: .bold))
                    
                    Text(entry.accountName)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.8))
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Balance
                Text(entry.balance)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(.white)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                
                // Address
                Text(entry.accountAddress)
                    .font(.system(size: 10, weight: .regular))
                    .foregroundColor(.white.opacity(0.5))
            }
            .padding()
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }
}

// MARK: - Medium Widget View
struct MediumBalanceView: View {
    let entry: BalanceEntry
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.13, green: 0.13, blue: 0.15),
                    Color(red: 0.08, green: 0.08, blue: 0.10)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            HStack(spacing: 16) {
                // Left side - Fox icon
                VStack {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [.orange, .orange.opacity(0.7)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 56, height: 56)
                        
                        Image(systemName: "wallet.pass.fill")
                            .foregroundColor(.white)
                            .font(.system(size: 24, weight: .bold))
                    }
                }
                .padding(.leading, 8)
                
                // Right side - Account info and balance
                VStack(alignment: .leading, spacing: 6) {
                    Text(entry.accountName)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.white)
                    
                    Text(entry.accountAddress)
                        .font(.system(size: 11, weight: .regular))
                        .foregroundColor(.white.opacity(0.6))
                    
                    Spacer()
                    
                    Text(entry.balance)
                        .font(.system(size: 32, weight: .bold))
                        .foregroundColor(.white)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                    
                    Text("Aggregated Balance")
                        .font(.system(size: 10, weight: .regular))
                        .foregroundColor(.white.opacity(0.5))
                }
                
                Spacer()
            }
            .padding()
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }
}

// MARK: - Large Widget View
struct LargeBalanceView: View {
    let entry: BalanceEntry
    
    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.13, green: 0.13, blue: 0.15),
                    Color(red: 0.08, green: 0.08, blue: 0.10)
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            
            VStack(alignment: .leading, spacing: 16) {
                // Header
                HStack {
                    ZStack {
                        Circle()
                            .fill(
                                LinearGradient(
                                    gradient: Gradient(colors: [.orange, .orange.opacity(0.7)]),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 44, height: 44)
                        
                        Image(systemName: "wallet.pass.fill")
                            .foregroundColor(.white)
                            .font(.system(size: 20, weight: .bold))
                    }
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("MetaMask")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        
                        Text(entry.accountName)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    
                    Spacer()
                }
                
                Divider()
                    .background(Color.white.opacity(0.2))
                
                // Balance section
                VStack(alignment: .leading, spacing: 8) {
                    Text("Total Balance")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.white.opacity(0.6))
                    
                    Text(entry.balance)
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.white)
                        .minimumScaleFactor(0.5)
                        .lineLimit(1)
                    
                    Text(entry.currency)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.5))
                }
                
                Spacer()
                
                // Footer
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Address")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.5))
                        
                        Text(entry.accountAddress)
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.white.opacity(0.8))
                    }
                    
                    Spacer()
                    
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("Last Updated")
                            .font(.system(size: 10, weight: .medium))
                            .foregroundColor(.white.opacity(0.5))
                        
                        Text(entry.lastUpdated, style: .time)
                            .font(.system(size: 12, weight: .regular))
                            .foregroundColor(.white.opacity(0.8))
                    }
                }
            }
            .padding()
        }
        .redacted(reason: entry.isPlaceholder ? .placeholder : [])
    }
}

// MARK: - Lock Screen Widgets
struct CircularBalanceView: View {
    let entry: BalanceEntry
    
    var body: some View {
        ZStack {
            AccessoryWidgetBackground()
            
            VStack(spacing: 2) {
                Image(systemName: "wallet.pass.fill")
                    .font(.system(size: 14))
                
                Text(entry.balance)
                    .font(.system(size: 10, weight: .bold))
                    .minimumScaleFactor(0.5)
            }
        }
    }
}

struct RectangularBalanceView: View {
    let entry: BalanceEntry
    
    var body: some View {
        HStack {
            Image(systemName: "wallet.pass.fill")
                .font(.system(size: 20))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(entry.accountName)
                    .font(.system(size: 12, weight: .semibold))
                    .lineLimit(1)
                
                Text(entry.balance)
                    .font(.system(size: 14, weight: .bold))
                    .lineLimit(1)
            }
            
            Spacer()
        }
    }
}

struct InlineBalanceView: View {
    let entry: BalanceEntry
    
    var body: some View {
        HStack {
            Image(systemName: "wallet.pass.fill")
            Text("\(entry.accountName): \(entry.balance)")
        }
    }
}

// MARK: - Widget Configuration
@main
struct BalanceWidget: Widget {
    let kind: String = "BalanceWidget"
    
    var body: some WidgetConfiguration {
        IntentConfiguration(
            kind: kind,
            intent: SelectAccountIntent.self,
            provider: BalanceTimelineProvider()
        ) { entry in
            BalanceWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("MetaMask Balance")
        .description("View your wallet balance at a glance")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline
        ])
    }
}

// MARK: - Preview
struct BalanceWidget_Previews: PreviewProvider {
    static var previews: some View {
        Group {
            BalanceWidgetEntryView(entry: .placeholder)
                .previewContext(WidgetPreviewContext(family: .systemSmall))
                .previewDisplayName("Small")
            
            BalanceWidgetEntryView(entry: .placeholder)
                .previewContext(WidgetPreviewContext(family: .systemMedium))
                .previewDisplayName("Medium")
            
            BalanceWidgetEntryView(entry: .placeholder)
                .previewContext(WidgetPreviewContext(family: .systemLarge))
                .previewDisplayName("Large")
        }
    }
}

