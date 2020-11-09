//
//  MetaMaskWidget.swift
//  MetaMaskWidget
//
//  Created by Andre Pimenta on 06/11/2020.
//  Copyright © 2020 MetaMask. All rights reserved.
//

import WidgetKit
import SwiftUI

struct BookmarksJson: Decodable {
    enum Category: String, Decodable {
        case swift, combine, debugging, xcode
    }

    let bookmarks: Array<String>
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
      SimpleEntry(date: Date(), bookmarks: ["uniswap.exchange", "aave.com", "compound.finance", "1inch.exchange", "opensea.io"])
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
      let entry = SimpleEntry(date: Date(), bookmarks: ["uniswap.exchange", "aave.com", "compound.finance", "1inch.exchange", "opensea.io"])
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
      let jsonString = UserDefaults(suiteName: "group.io.metamask")?.string(forKey: "data")
      let jsonData = jsonString!.data(using: .utf8)!
      
      let bookmarksJson: BookmarksJson = try! JSONDecoder().decode(BookmarksJson.self, from: jsonData)
           
      var entries: [SimpleEntry] = []

      // Generate a timeline consisting of five entries an hour apart, starting from the current date.
      let currentDate = Date()
      for hourOffset in 0 ..< 5 {
          let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
          let entry = SimpleEntry(date: entryDate, bookmarks: bookmarksJson.bookmarks)
            entries.append(entry)
      }

      let timeline = Timeline(entries: entries, policy: .atEnd)
      completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let bookmarks: Array<String>
}


struct MetaMaskWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var widgetFamily

  var header : some View {
    return HStack(alignment: .center) {
      Link(destination:URL(string: "metamask://browser")!){
        Image(uiImage: UIImage(named: "Icon") ?? UIImage()).resizable().frame(width: 24.0, height: 24.0)
      }
      if widgetFamily != .systemSmall {
        Spacer()
        Link(destination:URL(string: "metamask://transactions")!){
          Image(systemName: "list.dash").foregroundColor(Color(red: 246/255, green: 133/255, blue: 27/255)).font(.system(size: 22))

        }
      }
      Spacer()
      Link(destination:URL(string: "metamask://send")!){
        Image(systemName: "arrow.up.right").foregroundColor(Color(red: 246/255, green: 133/255, blue: 27/255)).font(.system(size: 22))

      }
      Spacer()
      Link(destination:URL(string: "metamask://receive")!){
        Image(systemName: "arrow.down.to.line").foregroundColor(Color(red: 246/255, green: 133/255, blue: 27/255)).font(.system(size: 22))

      }
    }.frame(minWidth: 0, maxWidth: .infinity, minHeight: 0, alignment: .leading).padding(.top, 30).padding(.bottom, 0).padding(.horizontal, 30)
  }
  
  struct CustomShape: Shape {
      let radius: CGFloat
      
      func path(in rect: CGRect) -> Path {
          var path = Path()

          let start = CGPoint(x: rect.minX, y: rect.minY)

          // Do stuff here to draw the outline of the mask
          path.move(to: start)
          
          return path
      }
  }

  struct ExDivider: View {
    let color: Color = Color(.white)
    let width: CGFloat = 0.75
      var body: some View {
          Rectangle()
              .fill(color)
              .frame(height: width)
              .edgesIgnoringSafeArea(.horizontal)
      }
  }
  
  var content : some View {
    
    let firstMaxNumber = widgetFamily == .systemLarge ? 9 : 3
    
    let isMin3 = self.entry.bookmarks.count > firstMaxNumber
    
    let firstMax = self.entry.bookmarks.count > firstMaxNumber ? firstMaxNumber : self.entry.bookmarks.count
    
    let maxNumber = widgetFamily == .systemLarge ? 18 : 6
    let max = self.entry.bookmarks.count > maxNumber ? maxNumber : self.entry.bookmarks.count
    
    return VStack {
      header
      HStack (alignment: .top, spacing: /*@START_MENU_TOKEN@*/nil/*@END_MENU_TOKEN@*/) {
        HStack(){
          VStack{
            ForEach(0 ..< firstMax) {
              let url = self.entry.bookmarks[$0]
              Link(destination: URL(string: "dapp://" + url)!) {
                VStack {
                  Text(url).font(.caption).foregroundColor(Color(.darkGray)).bold()
                }
              }
              ExDivider()
            }
            Spacer()
          }
          if isMin3 && widgetFamily != .systemSmall{
            VStack{
              ForEach(firstMaxNumber ..< max) {
                let url = self.entry.bookmarks[$0]
                Link(destination: URL(string: "dapp://" + url)!) {
                  VStack {
                    Text(url).font(.caption).foregroundColor(Color(.darkGray)).bold()
                  }
                }
                ExDivider()
              }
              Spacer()
            }
          }
        }.padding(.top, 10).background(Color(red: 242/255, green: 242/255, blue: 247/255))
      }.padding(.top, 5).padding(.bottom, 0).padding(.horizontal, 0)
      Spacer()
    }
  }
  
    var body: some View {
      content.widgetURL(URL(string: "metamask://wallet"))
    }
}

@main
struct MetaMaskWidget: Widget {
    let kind: String = "MetaMaskWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            MetaMaskWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("MetaMask Widget")
        .description("This is the MetaMask Widget.")
        .supportedFamilies([.systemMedium, .systemLarge])
    }
}

struct MetaMaskWidget_Previews: PreviewProvider {
    static var previews: some View {
      MetaMaskWidgetEntryView(entry: SimpleEntry(date: Date(), bookmarks: ["uniswap.exchange", "aave.com", "compound.finance", "1inch.exchange", "opensea.io"] ))
            .previewContext(WidgetPreviewContext(family: .systemMedium))
    }
}
