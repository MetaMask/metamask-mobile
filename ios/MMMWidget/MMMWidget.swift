//
//  MMMWidget.swift
//  MMMWidget
//
//  Created by Seth Kaufman on 5/7/24.
//  Copyright © 2024 MetaMask. All rights reserved.
//

import WidgetKit
import SwiftUI
import Intents

typealias ConfigurationIntent = INIntent
let gasFeeProvider = GasFeeProvider.shared

struct MMProvider: TimelineProvider {  
  func placeholder(in context: Context) -> GasFeeEntry {
      return GasFeeEntry(date: Date(), lowGwei: "-", marketGwei: "-", aggressiveGwei: "-")
  }
  
  func getSnapshot(in context: Context, completion: @escaping (GasFeeEntry) -> Void) {
    print("getSnapshot")
    if let gasFees = gasFeeProvider.fetchGasFees() {
      print("Gas Fees", gasFees)
      let low = String(format: "%.0f", (Double(gasFees.low.suggestedMaxFeePerGas) ?? 0))
      let market = String(format: "%.0f",  (Double(gasFees.medium.suggestedMaxFeePerGas) ?? 0))
      let high = String(format: "%.0f", (Double(gasFees.high.suggestedMaxFeePerGas) ?? 0))
      let entry = GasFeeEntry(date: Date(), lowGwei: low, marketGwei: market, aggressiveGwei: high)
      completion(entry)
      return
    } else {
      let entry = GasFeeEntry(date: Date(), lowGwei: "-", marketGwei: "-", aggressiveGwei: "-")
      completion(entry)
    }
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<GasFeeEntry>) -> Void) {
      print("getTimeline")
      let entryDate = Date()
      if let gasFees = gasFeeProvider.fetchGasFees() {
        print("Gas Fees", gasFees)
        let low = String(format: "%.0f", (Double(gasFees.low.suggestedMaxFeePerGas) ?? 0))
        let market = String(format: "%.0f",  (Double(gasFees.medium.suggestedMaxFeePerGas) ?? 0))
        let high = String(format: "%.0f", (Double(gasFees.high.suggestedMaxFeePerGas) ?? 0))
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
        let entry = GasFeeEntry(date: nextRefresh, lowGwei: low, marketGwei: market, aggressiveGwei: high)
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
        return
      } else {
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
        let entry = GasFeeEntry(date: nextRefresh, lowGwei: "-", marketGwei: "-", aggressiveGwei: "-")
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
      }
  }

}

struct GasFeeEntry: TimelineEntry {
  let date: Date
  let lowGwei: String
  let marketGwei: String
  let aggressiveGwei: String
}


struct MMMWidget: Widget {
  let kind: String = "MMMWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MMProvider()) { entry in
      //Widget Init
      SmallBalanceWidgetSmall(entry: entry)
    }
    .configurationDisplayName("Gas Guage")
    .description("Check current Ethereum Mainnet gas cost")
    .supportedFamilies([.systemSmall])
  }
}

struct MMMWidget_Previews: PreviewProvider {
  static var previews: some View {
    SmallBalanceWidgetSmall(entry: GasFeeEntry(date: Date(), lowGwei: "3.02", marketGwei: "5.18", aggressiveGwei: "6.23"))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}

//Small Balance Widget https://www.figma.com/file/l3YXLHorNYToVwql5Gwzir/Widgets?type=design&node-id=37-1137&mode=design&t=P3OKttRwaQ1UIMG7-4
struct SmallBalanceWidgetSmall: View {
  var entry: GasFeeEntry
  
  var body: some View {
    ZStack() {
      VStack(alignment: .leading, spacing: 8) {
        HStack(spacing: 32) {
          Text("🐢")
              .font(Font.custom("Euclid Circular B", size: 20).weight(.bold))
              .lineSpacing(28.12)
              .foregroundColor(Color(red: 0.14, green: 0.16, blue: 0.18))
          VStack(alignment: .leading, spacing: 4) {
            Text("Low")
                .font(Font.custom("SF Pro Rounded", size: 10).weight(.bold))
                .lineSpacing(14.06)
                .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
            Text(entry.lowGwei + " GWEI")
                .font(Font.custom("SF Pro Rounded", size: 12).weight(.bold))
                .lineSpacing(16.88)
                .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
          }
          .frame(width: 69)
        }
        .frame(width: 123)
        HStack(spacing: 32) {
          Text("🦊")
              .font(Font.custom("Euclid Circular B", size: 20).weight(.bold))
              .lineSpacing(28.12)
              .foregroundColor(Color(red: 0.14, green: 0.16, blue: 0.18))
          VStack(alignment: .leading, spacing: 4) {
            Text("Market")
                .font(Font.custom("SF Pro Rounded", size: 10).weight(.bold))
                .lineSpacing(14.06)
                .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
            Text(entry.marketGwei + " GWEI")
                .font(Font.custom("SF Pro Rounded", size: 12).weight(.bold))
                .lineSpacing(16.88)
                .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
          }
          .frame(width: 69)
        }
        .frame(width: 123)
        HStack(spacing: 32) {
          Text("🦍")
              .font(Font.custom("Euclid Circular B", size: 20).weight(.bold))
              .lineSpacing(28.12)
              .foregroundColor(Color(red: 0.14, green: 0.16, blue: 0.18))
          VStack(alignment: .leading, spacing: 4) {
            Text("Aggressive")
                .font(Font.custom("SF Pro Rounded", size: 10).weight(.bold))
                .lineSpacing(14.06)
                .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
            Text(entry.aggressiveGwei + " GWEI")
                .font(Font.custom("SF Pro Rounded", size: 12).weight(.bold))
                .lineSpacing(16.88)
                .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
          }
          .frame(width: 69)
        }
        .frame(width: 123)
      }
      .offset(x: 0, y: 14.50)
      HStack(spacing: 8) {
        Image("EthMainnet")
          .resizable()
          .frame(width: 16, height: 16.0)
          .padding([.leading])
        Text("Ethereum")
            .font(Font.custom("SF Pro Rounded", size: 14).weight(.bold))
            .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
        Image("MetaMaskLogo")
          .resizable()
          .frame(width: 20.0, height: 20.0)
          .padding([.trailing])
          .offset(x: 13, y: 0)
      }
      .offset(x: -13, y: -53.50)
    }
    .frame(width: 155, height: 155)
    .background(Color(red: 1, green: 1, blue: 1).opacity(0))
    
  }
}
