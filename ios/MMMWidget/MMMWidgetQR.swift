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

struct MMQRProvider: TimelineProvider {
  func placeholder(in context: Context) -> QREntry {
    print("placeholder")
    return QREntry(date: Date(), QRString: "-", accountName: "-", accountAddress: "-")
  }
  
  func getSnapshot(in context: Context, completion: @escaping (QREntry) -> Void) {
    print("getSnapshot")
  }
  
  func getTimeline(in context: Context, completion: @escaping (Timeline<QREntry>) -> Void) {
    print("getTimeline")
  }

}

struct MMMWidgetQR: Widget {
  let kind: String = "MMMWidgetQR"
  
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: MMProvider()) { entry in
      //Widget Init
      MMMWidgetQRSmall(entry: QREntry(date: Date(), QRString: "", accountName: "", accountAddress: ""))
    }
    .configurationDisplayName("Receive Funds Widget")
    .description("Quick scan for receiving funds")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct MMMWidgetQR_Previews: PreviewProvider {
  static var previews: some View {
    MMMWidgetQRSmall(entry: QREntry(date: Date(), QRString: "", accountName: "", accountAddress: ""))
      .previewContext(WidgetPreviewContext(family: .systemSmall))
  }
}

struct QREntry : TimelineEntry {
  let date: Date
  let QRString: String
  let accountName: String
  let accountAddress: String
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
                Text("Account 1")
                    .font(Font.custom("SF Pro Rounded", size: 18).weight(.bold))
                    .lineSpacing(24)
                    .foregroundColor(Color(red: 0.08, green: 0.09, blue: 0.09))
            }
            Text("0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045")
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
