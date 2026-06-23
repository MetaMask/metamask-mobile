import WidgetKit
import SwiftUI

// MARK: - Model

struct PriceEntry: TimelineEntry {
  let date: Date
  let price: Double?
  let changePct: Double?
  let sparkline: [Double]

  /// Gentle upward-trending sample used for the gallery placeholder / failed fetches.
  static let sampleSpark: [Double] = (0..<40).map { i -> Double in
    let x = Double(i)
    return 3000.0 + x * 1.7 + sin(x / 3.0) * 18.0
  }

  static let sample = PriceEntry(
    date: Date(), price: 3068.34, changePct: 0.66, sparkline: sampleSpark
  )
}

// MARK: - Networking
//
// The widget is self-contained: it fetches the ETH price, 24h change, and the
// 1-day price history directly from MetaMask's public price API. No App Group
// or app-side sync is involved.

enum PriceAPI {
  /// CAIP-19 id for native ETH on Ethereum mainnet, percent-encoded for the query.
  static let assetEncoded = "eip155%3A1%2Fslip44%3A60"
  /// Unencoded form for the path-based historical endpoint.
  static let assetPath = "eip155:1/slip44:60"

  static func fetch() async -> (price: Double?, changePct: Double?, spark: [Double]) {
    async let spot = fetchSpot()
    async let spark = fetchSparkline()
    let s = await spot
    return (s.0, s.1, await spark)
  }

  private static func fetchSpot() async -> (Double?, Double?) {
    let urlString =
      "https://price.api.cx.metamask.io/v3/spot-prices?assetIds=\(assetEncoded)&vsCurrency=usd&includeMarketData=true"
    guard let url = URL(string: urlString) else { return (nil, nil) }
    do {
      let (data, _) = try await URLSession.shared.data(from: url)
      if let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        let entry = obj[assetPath] as? [String: Any]
      {
        return (number(entry["price"]), number(entry["pricePercentChange1d"]))
      }
    } catch {}
    return (nil, nil)
  }

  private static func fetchSparkline() async -> [Double] {
    let urlString =
      "https://price.api.cx.metamask.io/v3/historical-prices/\(assetPath)?timePeriod=1d&vsCurrency=usd"
    guard let url = URL(string: urlString) else { return [] }
    do {
      let (data, response) = try await URLSession.shared.data(from: url)
      if (response as? HTTPURLResponse)?.statusCode == 204 { return [] }
      if let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any],
        let prices = obj["prices"] as? [[Any]]
      {
        let values = prices.compactMap { number($0.last) }
        return downsample(values, to: 48)
      }
    } catch {}
    return []
  }

  /// Tolerates numbers arriving as Double, NSNumber, or String.
  private static func number(_ value: Any?) -> Double? {
    if let d = value as? Double { return d }
    if let n = value as? NSNumber { return n.doubleValue }
    if let s = value as? String { return Double(s) }
    return nil
  }

  private static func downsample(_ arr: [Double], to n: Int) -> [Double] {
    guard arr.count > n, n > 1 else { return arr }
    let step = Double(arr.count - 1) / Double(n - 1)
    return (0..<n).map { arr[Int((Double($0) * step).rounded())] }
  }
}

// MARK: - Timeline Provider

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> PriceEntry { .sample }

  func getSnapshot(in context: Context, completion: @escaping (PriceEntry) -> Void) {
    if context.isPreview {
      completion(.sample)
      return
    }
    load(completion)
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<PriceEntry>) -> Void) {
    load { entry in
      // WidgetKit budgets a limited number of refreshes/day; 15 min is plenty.
      let next = Date().addingTimeInterval(15 * 60)
      completion(Timeline(entries: [entry], policy: .after(next)))
    }
  }

  private func load(_ completion: @escaping (PriceEntry) -> Void) {
    Task {
      let r = await PriceAPI.fetch()
      let entry = PriceEntry(
        date: Date(),
        price: r.price,
        changePct: r.changePct,
        sparkline: r.spark.count > 1 ? r.spark : PriceEntry.sampleSpark
      )
      completion(entry)
    }
  }
}

// MARK: - Sparkline

struct Sparkline: Shape {
  let data: [Double]

  func path(in rect: CGRect) -> Path {
    var path = Path()
    guard data.count > 1 else { return path }
    let minV = data.min() ?? 0
    let maxV = data.max() ?? 1
    let range = max(maxV - minV, 0.000_001)
    let stepX = rect.width / CGFloat(data.count - 1)
    for (i, v) in data.enumerated() {
      let x = rect.minX + CGFloat(i) * stepX
      let y = rect.maxY - CGFloat((v - minV) / range) * rect.height
      if i == 0 {
        path.move(to: CGPoint(x: x, y: y))
      } else {
        path.addLine(to: CGPoint(x: x, y: y))
      }
    }
    return path
  }
}

// MARK: - View

struct PriceWidgetEntryView: View {
  var entry: PriceEntry

  private static let background = LinearGradient(
    colors: [
      Color(red: 0.07, green: 0.06, blue: 0.03),  // near-black (top-left)
      Color(red: 0.22, green: 0.13, blue: 0.03),  // dark warm amber (bottom-right)
    ],
    startPoint: .topLeading,
    endPoint: .bottomTrailing
  )

  private static let lineGreen = Color(red: 0.42, green: 0.92, blue: 0.45)
  private static let lineRed = Color(red: 1.0, green: 0.45, blue: 0.42)

  private var isUp: Bool { (entry.changePct ?? 0) >= 0 }
  private var lineColor: Color { isUp ? Self.lineGreen : Self.lineRed }

  private var priceText: String {
    guard let p = entry.price else { return "$—" }
    let fmt = NumberFormatter()
    fmt.numberStyle = .currency
    fmt.currencyCode = "USD"
    fmt.minimumFractionDigits = 2
    fmt.maximumFractionDigits = 2
    return fmt.string(from: NSNumber(value: p)) ?? "$\(p)"
  }

  private var changeText: String {
    guard let c = entry.changePct else { return "—" }
    return String(format: "%+.2f%%", c)
  }

  private var content: some View {
    VStack(alignment: .leading, spacing: 0) {
      // Header: ETH token + label (leading), fox (trailing). No date.
      HStack(spacing: 6) {
        Image("eth")
          .resizable()
          .frame(width: 22, height: 22)
        Text("ETH")
          .font(.system(size: 15, weight: .semibold))
          .foregroundStyle(.white)
        Spacer(minLength: 0)
        Image("fox")
          .resizable()
          .aspectRatio(contentMode: .fit)
          .frame(width: 26, height: 26)
      }

      Spacer(minLength: 8)

      Text(priceText)
        .font(.system(size: 26, weight: .bold))
        .foregroundStyle(.white)
        .lineLimit(1)
        .minimumScaleFactor(0.6)

      HStack(spacing: 3) {
        Image(systemName: isUp ? "arrow.up.right" : "arrow.down.right")
          .font(.system(size: 12, weight: .bold))
        Text(changeText)
          .font(.system(size: 14, weight: .semibold))
      }
      .foregroundStyle(lineColor)

      Spacer(minLength: 8)

      Sparkline(data: entry.sparkline)
        .stroke(
          lineColor,
          style: StrokeStyle(lineWidth: 2.5, lineCap: .round, lineJoin: .round)
        )
        .frame(height: 52)
        .frame(maxWidth: .infinity)
    }
  }

  var body: some View {
    if #available(iOS 17.0, *) {
      content
        .containerBackground(for: .widget) { Self.background }
    } else {
      content
        .padding(16)
        .background(Self.background)
    }
  }
}

// MARK: - Widget

@main
struct PriceWidget: Widget {
  let kind = "PriceWidget"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: Provider()) { entry in
      PriceWidgetEntryView(entry: entry)
        // Tapping opens the app. Custom-scheme deeplinks only forward in DEBUG
        // builds in this app, so use a universal link.
        .widgetURL(URL(string: "https://link.metamask.io/home"))
    }
    .configurationDisplayName("ETH Price")
    .description("Live ETH price and 24h change.")
    .supportedFamilies([.systemSmall])
  }
}
