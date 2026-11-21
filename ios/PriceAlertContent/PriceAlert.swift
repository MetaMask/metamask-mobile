import Foundation

struct PriceAlert {
  let kind: String
  let symbol: String
  let asset: String
  let price: Double
  let change: Double
  let chart: Chart?
  let target: Double?
  let description: String

  struct Chart: Decodable {
    let v: Int
    let currency: String
    let start: Int
    let interval: Int
    var prices: [Double]
  }

  private static func parseChart(_ raw: Any?, price: Double) -> Chart? {
    guard let text = raw as? String, text.utf8.count <= 2048,
          var chart = try? JSONDecoder().decode(Chart.self, from: Data(text.utf8)),
          chart.v == 1, chart.currency == "usd",
          (1...253402214399).contains(chart.start), (1...1800).contains(chart.interval),
          (49...97).contains(chart.prices.count),
          (chart.prices.count - 1) * chart.interval == 86400,
          chart.prices.allSatisfy(Self.isPrice) else { return nil }
    chart.prices[chart.prices.count - 1] = price
    return chart
  }

  init?(_ data: [AnyHashable: Any]) {
    guard data["mm_delivery"] as? String == "price_alert",
          data["mm_ui"] as? String == "price_alert@1",
          let kind = data["kind"] as? String,
          let symbol = data["symbol"] as? String,
          symbol.range(of: "^[A-Z0-9]{1,12}$", options: .regularExpression) != nil,
          let asset = data["asset_id"] as? String,
          asset.range(of: "^[-a-z0-9]{3,8}:[-_a-zA-Z0-9]{1,32}/[-a-z0-9]{3,8}:[-.%a-zA-Z0-9]{1,128}$", options: .regularExpression) != nil,
          let price = Self.number(data["price"]), Self.isPrice(price),
          let change = Self.number(data["change_pct"]), abs(change) <= 1e6 else { return nil }

    if kind == "threshold", let direction = data["direction"] as? String,
       ["above", "below"].contains(direction),
       let target = Self.number(data["target"]), Self.isPrice(target) {
      self.target = target
      description = "Crossed \(direction) \(Self.usd(target))"
    } else if kind == "movement", let period = data["period"] as? String,
              ["5m", "1h", "24h"].contains(period) {
      target = nil
      description = "Price movement · \(period)"
    } else {
      return nil
    }
    self.kind = kind
    self.symbol = symbol
    self.asset = asset
    self.price = price
    self.change = change
    self.chart = Self.parseChart(data["chart"], price: price)
  }

  private static func number(_ value: Any?) -> Double? {
    guard let text = value as? String,
          text.range(of: "^-?\\d+(\\.\\d+)?$", options: .regularExpression) != nil,
          let number = Double(text), number.isFinite else { return nil }
    return number
  }

  private static func isPrice(_ value: Double) -> Bool { value > 0 && value <= 1e12 }

  static func usd(_ value: Double) -> String {
    value.formatted(.currency(code: "USD").locale(Locale(identifier: "en_US"))
      .precision(.fractionLength(2...(value >= 1 ? 2 : 8))))
  }

}
