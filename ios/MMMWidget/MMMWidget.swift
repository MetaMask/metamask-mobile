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

struct WidgetData: Decodable {
   var text: String
}

typealias ConfigurationIntent = INIntent
let gasFeeProvider = GasFeeProvider.shared

struct MMProvider: TimelineProvider {  
  func placeholder(in context: Context) -> SimpleEntry {
    gasFeeProvider.fetchGasFees(chain_id: "1")
      let userDefaults = UserDefaults.init(suiteName: "group.io.metamask.MetaMask")
      print("placeholder called", userDefaults!.value(forKey: "chainId") as? String)
      return SimpleEntry(date: Date(), text: "Provider")
  }
  
  func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> Void) {
    print("getSnapshot")
    let entry = SimpleEntry(date: Date(), text: "Data goes here")
    completion(entry)
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
      print("getTimeline")
      let entryDate = Date()
      let userDefaults = UserDefaults(suiteName: "group.io.metamask.MetaMask")
      guard let userDefaults = userDefaults else {
          print("UserDefaults not accessible")
          let entry = SimpleEntry(date: entryDate, text: "UserDefaults not accessible")
          let timeline = Timeline(entries: [entry], policy: .atEnd)
          completion(timeline)
          return
      }
  
      if let savedData = userDefaults.value(forKey: "chainId") as? String {
          guard let data = savedData.data(using: .utf8) else {
              print("Data encoding failed")
              let entry = SimpleEntry(date: entryDate, text: "Data encoding failed")
              let timeline = Timeline(entries: [entry], policy: .atEnd)
              completion(timeline)
              return
          }

          do {
              let parsedData = try JSONDecoder().decode(WidgetData.self, from: data)
              let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
              let entry = SimpleEntry(date: nextRefresh, text: parsedData.text)
              let timeline = Timeline(entries: [entry], policy: .atEnd)
              completion(timeline)
          } catch {
              print("Data parsing error: \(error)")
              let entry = SimpleEntry(date: entryDate, text: "Data parsing error")
              let timeline = Timeline(entries: [entry], policy: .atEnd)
              completion(timeline)
          }
      } else {
          print("No data set in UserDefaults")
          let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
          let entry = SimpleEntry(date: nextRefresh, text: "No data set")
          let timeline = Timeline(entries: [entry], policy: .atEnd)
          completion(timeline)
      }
  }

}

struct SimpleEntry: TimelineEntry {
      let date: Date
      let text: String
}

struct GasFeeEntry: TimelineEntry {
  let date: Date
  let networkName: String
  let chainId: String
  let lowGwei: Int
  let marketGwei: Int
  let aggressiveGwei: Int
}


struct MMMWidget: Widget {
  let kind: String = "MMMWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MMProvider()) { entry in
      //Widget Init
      SmallBalanceWidgetSmall(entry: entry)
    }
    .configurationDisplayName("Web3 Widgets")
    .description("Balance, quick links & more")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct MMMWidget_Previews: PreviewProvider {
  static var previews: some View {
    SmallBalanceWidgetSmall(entry: SimpleEntry(date: Date(), text: "Widget preview"))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}

let balanceKey = "widgetKey"
//Small Balance Widget https://www.figma.com/file/l3YXLHorNYToVwql5Gwzir/Widgets?type=design&node-id=37-1137&mode=design&t=P3OKttRwaQ1UIMG7-4
struct SmallBalanceWidgetSmall: View {
  var entry: MMProvider.Entry
  @AppStorage(balanceKey) var balance: String = "0"
  
  var body: some View {
    ZStack() {
//      Rectangle()
//        .foregroundColor(.clear)
//        .frame(width: 155, height: 155)
//        .background(.white)
//        .cornerRadius(16)
//        .offset(x: 0, y: 0)
//      Rectangle()
//        .foregroundColor(.clear)
//        .frame(width: 155, height: 155)
//        .background(.white)
//        .offset(x: 0, y: 0)
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
            Text("4 GWEI")
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
            Text("4 GWEI")
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
            Text("4 GWEI")
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
        Image("MetaMaskLogo")
          .foregroundColor(.clear)
          .frame(width: 16, height: 16)
          .background(Color(red: 0.95, green: 0.96, blue: 0.96))
        Text("ETH Mainnet")
            .font(Font.custom("SF Pro Rounded", size: 12).weight(.bold))
            .tracking(0.15)
            .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
        Image("MetaMaskLogo")
      }
      .offset(x: -26, y: -53.50)
    }
    .frame(width: 155, height: 155)
    .background(Color(red: 1, green: 1, blue: 1).opacity(0))
    
  }
}
