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

struct MMProvider: TimelineProvider {
  func placeholder(in context: Context) -> SimpleEntry {
      print("placeholder called")
      let userDefaults = UserDefaults.init(suiteName: "group.io.metamask.MetaMask")
      print("placeholder called", userDefaults!.value(forKey: "widgetKey") as? String)
      return SimpleEntry(date: Date(), text: "Placeholder")
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

      if let savedData = userDefaults.value(forKey: "widgetKey") as? String {
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

struct MMMWidgetEntryView : View {
  var entry: MMProvider.Entry
  
  var body: some View {
    HStack {
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .center) {
          Text(entry.text)
            .foregroundColor(Color(red: 1.00, green: 0.59, blue: 0.00))
            .font(Font.system(size: 21, weight: .bold, design: .rounded))
            .padding(.leading, -8.0)
        }
        .padding(.top, 10.0)
        .frame(maxWidth: .infinity)
        Text("Way to go!")
          .foregroundColor(Color(red: 0.69, green: 0.69, blue: 0.69))
          .font(Font.system(size: 14))
          .frame(maxWidth: .infinity)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }
}

struct MMMWidget: Widget {
  let kind: String = "MMMWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MMProvider()) { entry in
      MMMWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("MetaMask Widgets")
    .description("Checkout my NFT")
  }
}

struct MMMWidget_Previews: PreviewProvider {
  static var previews: some View {
    MMMWidgetEntryView(entry: SimpleEntry(date: Date(), text: "Widget preview"))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
