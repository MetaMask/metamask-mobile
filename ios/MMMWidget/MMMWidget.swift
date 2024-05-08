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
      let userDefaults = UserDefaults.init(suiteName: "group.io.metamask.MetaMask")
      print("placeholder called", userDefaults!.value(forKey: "widgetKey") as? String)
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
      GridRow {
        Text("Balance")
        Text("Fox")
            .gridColumnAlignment(.trailing)
      }
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .center) {
          Text(entry.text)
            .foregroundColor(Color(red: 1.00, green: 0.59, blue: 0.00))
            .font(Font.system(size: 21, weight: .bold, design: .rounded))
            .padding(.leading, -8.0)
        }
        .padding(.top, 10.0)
        .frame(maxWidth: .infinity)
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(.opacity(0.5))
  }
}

struct MMMWidget: Widget {
  let kind: String = "MMMWidget"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MMProvider()) { entry in
      //Widget Init
      SendReceiveBalanceWidgetMedium(entry: entry)
    }
    .configurationDisplayName("Web3 Widgets")
    .description("Balance, quick links & more")
  }
}

struct MMMWidget_Previews: PreviewProvider {
  static var previews: some View {
    MMMWidgetEntryView(entry: SimpleEntry(date: Date(), text: "Widget preview"))
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
      VStack(alignment: .leading, spacing: 0) {
        Text("Balance")
          .font(Font.custom("SF Pro Rounded", size: 17).weight(.semibold))
          .tracking(0.20)
          .foregroundColor(.black)
        Text("$\(balance)")
          .font(Font.custom("SF Pro Rounded", size: 22).weight(.bold))
          .tracking(0.20)
          .foregroundColor(.black)
      }
      .padding(EdgeInsets(top: 0, leading: 0, bottom: 77, trailing: 15))
      .offset(x: 0, y: 0)
      ZStack() {
        ZStack() {
          Group {
            ZStack() { }
            .frame(width: 40.35, height: 38.23)
            .offset(x: 0.01, y: -0.75)
            ZStack() { }
            .frame(width: 41, height: 19.83)
            .offset(x: 0, y: -9.94)
            ZStack() { }
            .frame(width: 25.41, height: 14.33)
            .offset(x: -0, y: 8.57)
            ZStack() { }
            .frame(width: 22.97, height: 11)
            .offset(x: -0, y: 6.91)
          }
          Group {
            ZStack() { }
            .frame(width: 16.91, height: 5.28)
            .offset(x: -0.01, y: 15.61)
          }
        }
        .frame(width: 41, height: 39.72)
        .offset(x: 0, y: 0)
      }
      .frame(width: 41, height: 39.72)
      .offset(x: -41, y: 41.16)
    }
    .frame(width: 155, height: 155)
    .cornerRadius(24);
  }
}

//Recent Activitiy Balance https://www.figma.com/file/l3YXLHorNYToVwql5Gwzir/Widgets?type=design&node-id=37-914&mode=design&t=P3OKttRwaQ1UIMG7-4
struct RecentActivityWidgetLarge: View {
  var entry: MMProvider.Entry
  
  var body: some View {
    ZStack() {
      HStack(spacing: 0) {
        Text("Recent activity")
          .font(Font.custom("SF Pro Rounded", size: 22).weight(.bold))
          .tracking(0.20)
          .foregroundColor(.black)
      }
      .padding(EdgeInsets(top: 0, leading: 0, bottom: 208, trailing: 151))
      .frame(height: 234)
      .offset(x: 0, y: -24.50)
      Text("See all")
        .font(Font.custom("SF Pro Rounded", size: 17).weight(.semibold))
        .tracking(0.20)
        .foregroundColor(Color(red: 0.03, green: 0.49, blue: 1))
        .offset(x: -0.50, y: 131.50)
      ZStack() {
        ZStack() {
          Group {
            ZStack() { }
            .frame(width: 27.11, height: 25.68)
            .offset(x: 0.01, y: -0.50)
            ZStack() { }
            .frame(width: 27.54, height: 13.32)
            .offset(x: 0, y: -6.68)
            ZStack() { }
            .frame(width: 17.07, height: 9.63)
            .offset(x: -0, y: 5.76)
            ZStack() { }
            .frame(width: 15.43, height: 7.39)
            .offset(x: -0, y: 4.64)
          }
          Group {
            ZStack() { }
            .frame(width: 11.36, height: 3.55)
            .offset(x: -0.01, y: 10.49)
          }
        }
        .frame(width: 27.54, height: 26.68)
        .offset(x: 0, y: 0)
      }
      .frame(width: 27.54, height: 26.68)
      .offset(x: 134.27, y: -128.16)
      VStack(alignment: .leading, spacing: 0) {
        HStack(alignment: .top, spacing: 0) {
          HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 0) {
              HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 10) {
                  HStack(alignment: .top, spacing: 10.90) {
                    HStack(spacing: 0) {
                      Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 15.25, height: 15.25)
                        .background(
                          AsyncImage(url: URL(string: "https://via.placeholder.com/15x15"))
                        )
                    }
                    .frame(width: 15.25, height: 15.25)
                  }
                  .padding(1.09)
                  .frame(width: 17.43, height: 17.43)
                  .background(.white)
                  .cornerRadius(1088.52)
                  HStack(spacing: 0) {
                    HStack(spacing: 0) {
                      HStack(spacing: 0) {
                        ZStack() { }
                        .frame(width: 20, height: 20)
                      }
                      .frame(width: 20, height: 20)
                    }
                    .frame(width: 20, height: 20)
                  }
                  .padding(6)
                  .frame(width: 32, height: 32)
                  .background(Color(red: 0.01, green: 0.46, blue: 0.79).opacity(0.10))
                  .cornerRadius(999)
                }
                .cornerRadius(999)
                VStack(alignment: .leading, spacing: 0) {
                  HStack(spacing: 10) {
                    Text("Swapped ETH for USDC")
                      .font(Font.custom("SF Pro Rounded", size: 16).weight(.medium))
                      .lineSpacing(24)
                      .foregroundColor(Color(red: 0.14, green: 0.15, blue: 0.16))
                  }
                  .frame(maxWidth: .infinity)
                  HStack(spacing: 4) {
                    HStack(spacing: 10) {
                      Text("Confirmed")
                        .font(Font.custom("SF Pro Rounded", size: 14).weight(.medium))
                        .lineSpacing(22)
                        .foregroundColor(Color(red: 0.16, green: 0.65, blue: 0.27))
                    }
                    .frame(maxWidth: .infinity, minHeight: 22, maxHeight: 22)
                  }
                  .frame(maxWidth: .infinity)
                }
                .frame(maxWidth: .infinity)
                VStack(alignment: .trailing, spacing: 2) {
                  VStack(alignment: .trailing, spacing: 0) {
                    HStack(spacing: 10) {
                      Text("5m ago")
                        .font(Font.custom("SF Pro Rounded", size: 12))
                        .tracking(0.25)
                        .lineSpacing(20)
                        .foregroundColor(Color(red: 0.53, green: 0.53, blue: 0.53))
                    }
                  }
                }
              }
              .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity)
          }
          .padding(EdgeInsets(top: 16, leading: 0, bottom: 16, trailing: 0))
          .frame(maxWidth: .infinity, minHeight: 78, maxHeight: 78)
        }
        .frame(maxWidth: .infinity)
        HStack(alignment: .top, spacing: 0) {
          HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 0) {
              HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 10) {
                  HStack(alignment: .top, spacing: 10.90) {
                    HStack(spacing: 0) {
                      Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 15.25, height: 15.25)
                        .background(
                          AsyncImage(url: URL(string: "https://via.placeholder.com/15x15"))
                        )
                    }
                    .frame(width: 15.25, height: 15.25)
                  }
                  .padding(1.09)
                  .frame(width: 17.43, height: 17.43)
                  .background(.white)
                  .cornerRadius(1088.52)
                  HStack(spacing: 0) {
                    HStack(spacing: 0) {
                      HStack(spacing: 0) {
                        ZStack() { }
                        .frame(width: 20, height: 20)
                      }
                      .frame(width: 20, height: 20)
                    }
                    .frame(width: 20, height: 20)
                  }
                  .padding(6)
                  .frame(width: 32, height: 32)
                  .background(Color(red: 0.01, green: 0.46, blue: 0.79).opacity(0.10))
                  .cornerRadius(999)
                }
                .cornerRadius(999)
                VStack(alignment: .leading, spacing: 0) {
                  HStack(spacing: 10) {
                    Text("Received 1.5 ETH")
                      .font(Font.custom("SF Pro Rounded", size: 16).weight(.medium))
                      .lineSpacing(24)
                      .foregroundColor(Color(red: 0.14, green: 0.15, blue: 0.16))
                  }
                  .frame(maxWidth: .infinity)
                  HStack(spacing: 4) {
                    HStack(spacing: 10) {
                      Text("Confirmed")
                        .font(Font.custom("SF Pro Rounded", size: 14).weight(.medium))
                        .lineSpacing(22)
                        .foregroundColor(Color(red: 0.16, green: 0.65, blue: 0.27))
                    }
                    .frame(maxWidth: .infinity, minHeight: 22, maxHeight: 22)
                  }
                  .frame(maxWidth: .infinity)
                }
                .frame(maxWidth: .infinity)
                VStack(alignment: .trailing, spacing: 2) {
                  VStack(alignment: .trailing, spacing: 0) {
                    HStack(spacing: 10) {
                      Text("2h ago")
                        .font(Font.custom("SF Pro Rounded", size: 12))
                        .tracking(0.25)
                        .lineSpacing(20)
                        .foregroundColor(Color(red: 0.53, green: 0.53, blue: 0.53))
                    }
                  }
                }
              }
              .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity)
          }
          .padding(EdgeInsets(top: 16, leading: 0, bottom: 16, trailing: 0))
          .frame(maxWidth: .infinity, minHeight: 78, maxHeight: 78)
        }
        .frame(maxWidth: .infinity)
        HStack(alignment: .top, spacing: 0) {
          HStack(alignment: .top, spacing: 10) {
            VStack(alignment: .leading, spacing: 0) {
              HStack(alignment: .top, spacing: 16) {
                VStack(alignment: .leading, spacing: 10) {
                  HStack(alignment: .top, spacing: 10.90) {
                    HStack(spacing: 0) {
                      Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 15.25, height: 15.25)
                        .background(
                          AsyncImage(url: URL(string: "https://via.placeholder.com/15x15"))
                        )
                    }
                    .frame(width: 15.25, height: 15.25)
                  }
                  .padding(1.09)
                  .frame(width: 17.43, height: 17.43)
                  .background(.white)
                  .cornerRadius(1088.52)
                  HStack(spacing: 0) {
                    HStack(spacing: 0) {
                      HStack(spacing: 0) {
                        ZStack() { }
                        .frame(width: 20, height: 20)
                      }
                      .frame(width: 20, height: 20)
                    }
                    .frame(width: 20, height: 20)
                  }
                  .padding(6)
                  .frame(width: 32, height: 32)
                  .background(Color(red: 0.01, green: 0.46, blue: 0.79).opacity(0.10))
                  .cornerRadius(999)
                }
                .cornerRadius(999)
                VStack(alignment: .leading, spacing: 0) {
                  HStack(spacing: 10) {
                    Text("Smart contract interaction")
                      .font(Font.custom("SF Pro Rounded", size: 16).weight(.medium))
                      .lineSpacing(24)
                      .foregroundColor(Color(red: 0.14, green: 0.15, blue: 0.16))
                  }
                  .frame(maxWidth: .infinity)
                  HStack(spacing: 4) {
                    HStack(spacing: 10) {
                      Text("Confirmed")
                        .font(Font.custom("SF Pro Rounded", size: 14).weight(.medium))
                        .lineSpacing(22)
                        .foregroundColor(Color(red: 0.16, green: 0.65, blue: 0.27))
                    }
                    .frame(maxWidth: .infinity, minHeight: 22, maxHeight: 22)
                  }
                  .frame(maxWidth: .infinity)
                }
                .frame(maxWidth: .infinity)
                VStack(alignment: .trailing, spacing: 2) {
                  VStack(alignment: .trailing, spacing: 0) {
                    HStack(spacing: 10) {
                      Text("last year")
                        .font(Font.custom("SF Pro Rounded", size: 12))
                        .tracking(0.25)
                        .lineSpacing(20)
                        .foregroundColor(Color(red: 0.53, green: 0.53, blue: 0.53))
                    }
                  }
                }
              }
              .frame(maxWidth: .infinity)
            }
            .frame(maxWidth: .infinity)
          }
          .padding(EdgeInsets(top: 16, leading: 0, bottom: 16, trailing: 0))
          .frame(maxWidth: .infinity, minHeight: 78, maxHeight: 78)
        }
        .frame(maxWidth: .infinity)
      }
      .frame(height: 234)
      .offset(x: -1.50, y: 4.50)
    }
    .frame(width: 335, height: 315)
    .background(Color(red: 1, green: 1, blue: 1).opacity(0.90))
    .cornerRadius(24);
  }
}

//Send/Recieve Balance https://www.figma.com/file/l3YXLHorNYToVwql5Gwzir/Widgets?type=design&node-id=37-978&mode=design&t=P3OKttRwaQ1UIMG7-4
struct SendReceiveBalanceWidgetMedium: View {
  var entry: MMProvider.Entry
  @AppStorage("widgetKey", store: UserDefaults(suiteName: "group.io.metamask.MetaMask")) var widgetValue: String = "0"  
  
  var body: some View {
    ZStack() {
      ZStack() {
        Text("Balance")
          .font(Font.custom("SF Pro Rounded", size: 17).weight(.semibold))
          .tracking(0.20)
          .foregroundColor(Color(red: 0.53, green: 0.53, blue: 0.53))
          .offset(x: -116, y: -27.50)
        Text("$\(widgetValue)")
          .font(Font.custom("SF Pro Rounded", size: 22).weight(.bold))
          .tracking(0.20)
          .foregroundColor(.black)
          .offset(x: -97.50, y: -4.50)
        HStack(alignment: .top, spacing: 16) {
          HStack(spacing: 0) {
            Text("Receive")
              .font(Font.custom("SF Pro Rounded", size: 17).weight(.semibold))
              .tracking(0.20)
              .foregroundColor(Color(red: 0.03, green: 0.49, blue: 1))
          }
          .padding(
            EdgeInsets(top: 19, leading: 33, bottom: 18, trailing: 25.50)
          )
          .frame(width: 143.50)
          .background(Color(red: 0.97, green: 0.97, blue: 0.97))
          .cornerRadius(16)
          HStack(spacing: 0) {
            Text("Send")
              .font(Font.custom("SF Pro Rounded", size: 17).weight(.semibold))
              .tracking(0.20)
              .foregroundColor(Color(red: 0.17, green: 0.53, blue: 0.91))
          }
          .frame(maxWidth: .infinity, minHeight: 61, maxHeight: 61)
          .background(Color(red: 0.97, green: 0.97, blue: 0.97))
          .cornerRadius(16)
        }
        .frame(width: 303)
        .offset(x: 0, y: 55)
      }
      .frame(width: 303, height: 75)
      .offset(x: 0, y: -24.50)
      ZStack() {
        ZStack() {
          Group {
            ZStack() { }
            .frame(width: 33.53, height: 31.76)
            .offset(x: 0.01, y: -0.62)
            ZStack() { }
            .frame(width: 34.07, height: 16.47)
            .offset(x: 0, y: -8.26)
            ZStack() { }
            .frame(width: 21.11, height: 11.91)
            .offset(x: -0, y: 7.12)
            ZStack() { }
            .frame(width: 19.09, height: 9.14)
            .offset(x: -0, y: 5.74)
          }
          Group {
            ZStack() { }
            .frame(width: 14.05, height: 4.39)
            .offset(x: -0.01, y: 12.97)
          }
        }
        .frame(width: 34.07, height: 33)
        .offset(x: -0, y: -0)
      }
      .frame(width: 34.07, height: 33)
      .offset(x: 130.34, y: -41.50)
    }
    .frame(width: 340, height: 161)
   .onAppear {
      print("Widget Value: \(widgetValue)")
    }
  }
}
