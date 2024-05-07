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

struct Provider: IntentTimelineProvider {
  typealias Entry = SimpleEntry
  typealias Intent = ConfigurationIntent
  func placeholder(in context: Context) -> SimpleEntry {
    print("placeholder called")
    
     return SimpleEntry(date: Date(), configuration: ConfigurationIntent(), text: "Placeholder")
  }
  
  func getSnapshot(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (SimpleEntry) -> ()) {
    print("placeholder called")
      let entry = SimpleEntry(date: Date(), configuration: configuration, text: "Data goes here")
      completion(entry)
  }
  
   func getTimeline(for configuration: ConfigurationIntent, in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> Void) {
     print("placeholder called")
      let userDefaults = UserDefaults.init(suiteName: "group.io.metamask.MetaMask")
      if userDefaults != nil {
        let entryDate = Date()
        if let savedData = userDefaults!.value(forKey: "widgetKey") as? String {
            let decoder = JSONDecoder()
            let data = savedData.data(using: .utf8)
            if let parsedData = try? decoder.decode(WidgetData.self, from: data!) {
                let nextRefresh = Calendar.current.date(byAdding: .minute, value: 5, to: entryDate)!
                let entry = SimpleEntry(date: nextRefresh, configuration: configuration, text: parsedData.text)
                let timeline = Timeline(entries: [entry], policy: .atEnd)
                completion(timeline)
            } else {
                print("Could not parse data")
            }
        } else {
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 5, to: entryDate)!
            let entry = SimpleEntry(date: nextRefresh, configuration: configuration, text: "No data set")
            let timeline = Timeline(entries: [entry], policy: .atEnd)
            completion(timeline)
        }
      }
  }
}

struct SimpleEntry: TimelineEntry {
   let date: Date
      let configuration: ConfigurationIntent
      let text: String
}

struct MMMWidgetEntryView : View {
  var entry: Provider.Entry
  
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
    IntentConfiguration(kind: kind, intent: ConfigurationIntent.self, provider: Provider()) { entry in
      MMMWidgetEntryView(entry: entry)
    }
    .configurationDisplayName("My Widget")
    .description("This is an example widget.")
  }
}

struct MMMWidget_Previews: PreviewProvider {
  static var previews: some View {
    MMMWidgetEntryView(entry: SimpleEntry(date: Date(), configuration: ConfigurationIntent(), text: "Widget preview"))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}
