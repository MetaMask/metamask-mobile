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
import CoreImage.CIFilterBuiltins

    var accountName =  ""
    var accountNumber = ""

struct MMQRProvider: TimelineProvider {
  func placeholder(in context: Context) -> QREntry {
    print("placeholder")
    return QREntry(date: Date(), error: false, QRString: "", data: WidgetQRData(accountName: accountName, accountNumber: accountNumber))
  }
  
  func getSnapshot(in context: Context, completion: @escaping (QREntry) -> Void) {
    print("getSnapshot")
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<QREntry>) -> Void) {
    print("getTimeline")
    let entryDate = Date()
    let userDefaults = UserDefaults(suiteName: "group.io.metamask.MetaMask")
    guard let userDefaults = userDefaults else {
        print("UserDefaults not accessible")
        let entry = QREntry(date: Date(), error: false, QRString: "", data: WidgetQRData(accountName: accountName, accountNumber: accountNumber))
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
        return
    }

print("userDefaults", userDefaults.value(forKey: "qrData"))
if let jsonString = userDefaults.string(forKey: "qrData") {
    if let jsonData = jsonString.data(using: .utf8),
    let savedData = try? JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: String] {

     accountName = savedData["accountName"] ?? ""
     accountNumber = savedData["accountNumber"] ?? ""
    }
    
        do {
            print("Getting data")
            // let parsedData = try JSONDecoder().decode(WidgetQRData.self, from: data)
            // print("parsedData", parsedData)
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
            let entry = QREntry(date: nextRefresh, QRString: "",data: WidgetQRData(accountName: accountName, accountNumber: accountNumber))
            let timeline = Timeline(entries: [entry], policy: .atEnd)
            completion(timeline)
        } catch {
            print("Data parsing error: \(error)")
            let entry = QREntry(date: Date(), error: false, QRString: "", data: WidgetQRData(accountName: accountName, accountNumber: accountNumber))
            let timeline = Timeline(entries: [entry], policy: .atEnd)
            completion(timeline)
        }
    } else {
        print("No data set in UserDefaults")
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
        let entry = QREntry(date: Date(), error: false, QRString: "", data: WidgetQRData(accountName: accountName, accountNumber: accountNumber))
        let timeline = Timeline(entries: [entry], policy: .atEnd)
        completion(timeline)
    }
  }

}

struct WidgetQRData: Decodable {
  let accountName: String
  let accountNumber: String
}

struct MMMWidgetQR: Widget {
  let kind: String = "MMMWidgetQR"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MMQRProvider()) { entry in
      //Widget Init
    MMMWidgetQRSmall(entry: QREntry(date: Date(), error: true, QRString: "", data: WidgetQRData(accountName: accountName, accountNumber: accountNumber))).previewContext(WidgetPreviewContext(family: .systemSmall))
    }
    .configurationDisplayName("Receive Funds Widget")
    .description("Quick scan for receiving funds on your current account")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct MMMWidgetQR_Previews: PreviewProvider {
  static var previews: some View {
    MMMWidgetQRSmall(entry: QREntry(date: Date(), error: false, QRString: "", data: WidgetQRData(accountName: "", accountNumber: "")))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}

struct QREntry : TimelineEntry {
    let date: Date
    var error: Bool = false
    let QRString: String
    let data: WidgetQRData
}

// Small QR Widget
// https://www.figma.com/file/l3YXLHorNYToVwql5Gwzir/Widgets?type=design&node-id=37-1137&mode=design&t=P3OKttRwaQ1UIMG7-4
struct MMMWidgetQRSmall: View {
  var entry: QREntry
  
  var body: some View {
    ZStack() {
        Rectangle()
            .foregroundColor(.clear)
            .frame(width: 329, height: 155)
            .background(.white)
            .cornerRadius(16)
            .offset(x: 0, y: 0)
        ZStack() {
            Rectangle()
                .foregroundColor(.clear)
                .frame(width: 115.62, height: 116.44)
                .background(
                    AsyncImage(url: URL(string: "https://via.placeholder.com/116x116"))
                )
                .offset(x: 0.07, y: 0.11)
            Rectangle()
                .foregroundColor(.clear)
                .frame(width: 123, height: 123)
                .cornerRadius(4.91)
                .overlay(
                    RoundedRectangle(cornerRadius: 4.91)
                        .inset(by: 0.31)
                        .stroke(Color(red: 0.95, green: 0.96, blue: 0.96), lineWidth: 0.31)
                )
                .offset(x: 0, y: 0)
            Rectangle()
                .foregroundColor(.clear)
                .frame(width: 32.35, height: 32.35)
                .background(.white)
                .offset(x: 0.19, y: -0.94)
            HStack(spacing: 0) {
                Rectangle()
                    .foregroundColor(.clear)
                    .frame(width: 22.96, height: 21.17)
                    .background(
                        AsyncImage(url: URL(string: "https://via.placeholder.com/23x21"))
                    )
            }
            .padding(EdgeInsets(top: 0.01, leading: 0, bottom: 0.01, trailing: 0))
            .frame(width: 22.96, height: 21.20)
            .offset(x: 0.01, y: -0.50)
            ZStack() {
                Rectangle()
                    .foregroundColor(.clear)
                    .frame(width: 25.95, height: 25.58)
                    .background(.white)
                    .offset(x: -38.93, y: -39.87)
                Rectangle()
                    .foregroundColor(.clear)
                    .frame(width: 25.95, height: 25.58)
                    .background(.white)
                    .offset(x: 40.06, y: -39.87)
                Rectangle()
                    .foregroundColor(.clear)
                    .frame(width: 25.95, height: 25.58)
                    .background(.white)
                    .offset(x: -40.06, y: 39.87)
                ZStack() {
                    Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 18.81, height: 18.81)
                        .cornerRadius(4.91)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4.91)
                                .inset(by: 0.92)
                                .stroke(Color(red: 0.08, green: 0.09, blue: 0.09), lineWidth: 0.92)
                        )
                        .offset(x: 0, y: 0)
                    Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 9.03, height: 9.03)
                        .background(Color(red: 0.08, green: 0.09, blue: 0.09))
                        .cornerRadius(2.45)
                        .offset(x: 0, y: -0)
                }
                .frame(width: 18.81, height: 18.81)
                .offset(x: -38.74, y: -39.12)
                ZStack() {
                    Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 18.81, height: 18.81)
                        .cornerRadius(4.91)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4.91)
                                .inset(by: 0.92)
                                .stroke(Color(red: 0.08, green: 0.09, blue: 0.09), lineWidth: 0.92)
                        )
                        .offset(x: 0, y: 0)
                    Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 9.03, height: 9.03)
                        .background(Color(red: 0.08, green: 0.09, blue: 0.09))
                        .cornerRadius(2.45)
                        .offset(x: 0, y: 0)
                }
                .frame(width: 18.81, height: 18.81)
                .offset(x: -38.74, y: 39.87)
                ZStack() {
                    Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 18.81, height: 18.81)
                        .cornerRadius(4.91)
                        .overlay(
                            RoundedRectangle(cornerRadius: 4.91)
                                .inset(by: 0.92)
                                .stroke(Color(red: 0.08, green: 0.09, blue: 0.09), lineWidth: 0.92)
                        )
                        .offset(x: 0, y: 0)
                    Rectangle()
                        .foregroundColor(.clear)
                        .frame(width: 9.03, height: 9.03)
                        .background(Color(red: 0.08, green: 0.09, blue: 0.09))
                        .cornerRadius(2.45)
                        .offset(x: 0, y: -0)
                }
                .frame(width: 18.81, height: 18.81)
                .offset(x: 40.25, y: -39.12)
            }
            .frame(width: 106.07, height: 105.32)
            .offset(x: 0.56, y: -0.56)
        }
        .frame(width: 123, height: 123)
        .offset(x: -87, y: 0)
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Receive")
                    .font(Font.custom("SF Pro Rounded", size: 14).weight(.bold))
                    .tracking(0.15)
                    .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
                Text(entry.data.accountName)
                    .font(Font.custom("SF Pro Rounded", size: 18).weight(.bold))
                    .lineSpacing(24)
                    .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
            }
            Text(entry.data.accountNumber)
                .font(Font.custom("SF Pro Rounded", size: 10).weight(.semibold))
                .tracking(0.25)
                .lineSpacing(16)
                .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
        }
        .offset(x: 68.50, y: -17)
        HStack(spacing: 0) {
            Rectangle()
                .foregroundColor(.clear)
                .frame(width: 24, height: 22.43)
                .background(
                    AsyncImage(url: URL(string: "https://via.placeholder.com/24x22"))
                )
          Text(entry.data.accountName)
              .font(Font.custom("SF Pro Rounded", size: 14).weight(.bold))
              .tracking(0.15)
              .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
        }
        .padding(EdgeInsets(top: 0.04, leading: 0, bottom: 0.04, trailing: 0))
        .frame(width: 24, height: 22.50)
        .offset(x: 136.50, y: -50.25)
    }
    .frame(width: 329, height: 155)
    .background(.white)
    .cornerRadius(16)
  }
}
