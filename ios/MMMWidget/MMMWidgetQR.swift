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

var accountName =  ""
var accountNumber = ""
let qrProvider = QRProvider.shared

struct MMQRProvider: TimelineProvider {
  func placeholder(in context: Context) -> QREntry {
    print("placeholder")
    let entryDate = Date()
    let userDefaults = UserDefaults(suiteName: "group.io.metamask.MetaMask")
    
    guard let userDefaults = userDefaults else {
      print("UserDefaults not accessible")
      return QREntry(date: Date(), error: false, accountName: accountName, accountNumber: accountNumber)
    }
    
    
    if let jsonString = userDefaults.string(forKey: "qrData") {
      if let jsonData = jsonString.data(using: .utf8),
         let savedData = try? JSONSerialization.jsonObject(with: jsonData, options: []) as? [String: String] {
        accountName = savedData["accountName"] ?? ""
        accountNumber = savedData["accountNumber"] ?? ""
      }
      do {
        print("Getting data")
        let qr = qrProvider.generateQR(accountNumber: accountNumber, network: "1")
        print(qr)
        let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
        let entry = QREntry(date: nextRefresh, accountName: accountName, accountNumber: accountNumber)
        return entry
      }
    }
    return QREntry(date: Date(), error: false, accountName: accountName, accountNumber: accountNumber)
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
        let entry = QREntry(date: Date(), error: false, accountName: accountName, accountNumber: accountNumber)
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
                let qr = qrProvider.generateQR(accountNumber: accountNumber, network: "1")
                print(qr)
                let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
                let entry = QREntry(date: nextRefresh, accountName: accountName, accountNumber: accountNumber)
                let timeline = Timeline(entries: [entry], policy: .atEnd)
                completion(timeline)
            } catch {
                print("Data parsing error: \(error)")
                let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
                let entry = QREntry(date: nextRefresh, accountName: accountName, accountNumber: accountNumber)
                let timeline = Timeline(entries: [entry], policy: .atEnd)
                completion(timeline)
            }
        } else {
            print("No data set in UserDefaults")
            let nextRefresh = Calendar.current.date(byAdding: .minute, value: 1, to: entryDate)!
            let entry = QREntry(date: nextRefresh, accountName: accountName, accountNumber: accountNumber)
            let timeline = Timeline(entries: [entry], policy: .atEnd)
            completion(timeline)
        }
      }
}

struct MMMWidgetQR: Widget {
  let kind: String = "MMMWidgetQR"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MMQRProvider()) { entry in
      //Widget Init
      MMMWidgetQRMedium(entry: QREntry(date: Date(), error: false,  accountName: "sss.eth", accountNumber: "0xF1a57530Ee9669f019E86e318F5697BC523D3D1a"))
        .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
    .configurationDisplayName("Receive Funds Widget")
    .description("Quick scan for receiving funds on Linea")
    .supportedFamilies([.systemMedium])
  }
}

struct MMMWidgetQR_Previews: PreviewProvider {
  static var previews: some View {
    MMMWidgetQRMedium(entry: QREntry(date: Date(), error: false,  accountName: "sss.eth", accountNumber: "0xF1a57530Ee9669f019E86e318F5697BC523D3D1a"))
      .previewContext(WidgetPreviewContext(family: .systemMedium))
  }
}

struct QREntry : TimelineEntry {
    let date: Date
    var error: Bool = false
    let accountName: String
    let accountNumber: String
}

// Small QR Widget
// https://www.figma.com/file/l3YXLHorNYToVwql5Gwzir/Widgets?type=design&node-id=37-1137&mode=design&t=P3OKttRwaQ1UIMG7-4
struct MMMWidgetQRMedium: View {
  var entry: QREntry
  
  var body: some View {
    ZStack() {
        ZStack() {
          Text("Receive")
              .font(Font.custom("SF Pro Rounded", size: 14).weight(.bold))
              .tracking(0.15)
              .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
              .offset(y: -65)
          Image(uiImage: qrProvider.generateQR(accountNumber: entry.accountNumber, network: "59144"))
              .interpolation(.none) // Prevents blurring
              .resizable() // Allows the image to resize
              .scaledToFit() // Ensures the QR code fits within the view bounds
              .frame(width: 110, height: 110) // Set the QR code size
              .cornerRadius(4.91)
              .padding() // Adds padding around the QR code
          Rectangle()
              .foregroundColor(.white)
              .frame(width: 28, height: 28)
              .cornerRadius(4.91)
              .background(.white)
              .offset(x: 0.19, y: -0.94)
          Image("linea-mainnet-logo")
            .interpolation(.none) // Prevents blurring
            .resizable() // Allows the image to resize
            .frame(width: 24, height:24)
            .cornerRadius(4.91)
            .background(.white)
            .offset(x: 0.19, y: -0.94)
        }
        .frame(width: 123, height: 123)
        .offset(x: -87, y: 8)
        VStack(alignment: .leading, spacing: 16) {
            VStack(alignment: .leading, spacing: 0) {
              Text("Account")
                  .font(Font.custom("SF Pro Rounded", size: 14).weight(.bold))
                  .tracking(0.15)
                  .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
                Text(entry.accountName)
                    .font(Font.custom("SF Pro Rounded", size: 18).weight(.bold))
                    .lineSpacing(24)
                    .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
            }
          HStack(spacing: 0) {
            Text(entry.accountNumber.prefix(6))
              .font(Font.custom("SF Pro Rounded", size: 12).weight(.heavy))
              .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
            Text(entry.accountNumber[6..<27])
              .font(Font.custom("SF Pro Rounded", size: 10))
              .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
          }
          HStack(spacing: 0) {
            Text(entry.accountNumber[27..<37])
              .font(Font.custom("SF Pro Rounded", size: 10))
              .foregroundColor(Color(red: 0.62, green: 0.65, blue: 0.68))
            Text(entry.accountNumber.suffix(5))
              .font(Font.custom("SF Pro Rounded", size: 12).weight(.heavy))
              .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
          }
          .offset(y: -15)
        }
        .offset(x: 68.50, y: -17)
        HStack(spacing: 0) {
          Image("MetaMaskLogo")
                .foregroundColor(.clear)
                .frame(width: 24, height: 22.43)
          Text(entry.accountName)
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

extension String {
    subscript(_ range: CountableRange<Int>) -> String {
        let idx1 = index(startIndex, offsetBy: max(0, range.lowerBound))
        let idx2 = index(startIndex, offsetBy: min(self.count, range.upperBound))
        return String(self[idx1..<idx2])
    }
}
