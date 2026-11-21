import UIKit
import UserNotifications

final class NotificationService: UNNotificationServiceExtension {
  private let lock = NSLock()
  private var completion: ((UNNotificationContent) -> Void)?
  private var original: UNNotificationContent?

  override func didReceive(_ request: UNNotificationRequest,
                           withContentHandler handler: @escaping (UNNotificationContent) -> Void) {
    let content = request.content
    lock.lock()
    completion = handler
    original = content
    lock.unlock()

    guard let alert = PriceAlert(content.userInfo),
          let update = content.mutableCopy() as? UNMutableNotificationContent else {
      finish(content)
      return
    }

    do {
      if let prices = alert.chart?.prices {
        update.attachments = [try attachment(alert: alert, prices: prices)]
      }
      update.categoryIdentifier = "mm-price-alert-v1"
      update.title = "\(alert.symbol) · \(PriceAlert.usd(alert.price))"
      update.body = "\(alert.change >= 0 ? "+" : "")\(alert.change)% · \(alert.description)"
      finish(update)
    } catch {
      finish(content)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    lock.lock()
    let content = original
    lock.unlock()
    if let content { finish(content) }
  }

  private func finish(_ content: UNNotificationContent) {
    lock.lock()
    let handler = completion
    completion = nil
    original = nil
    lock.unlock()
    handler?(content)
  }

  private func attachment(alert: PriceAlert, prices: [Double]) throws -> UNNotificationAttachment {
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    format.opaque = true
    let size = CGSize(width: 600, height: 300)
    let tint = alert.change >= 0 ? UIColor(red: 185/255, green: 243/255, blue: 2/255, alpha: 1)
      : UIColor(red: 1, green: 117/255, blue: 132/255, alpha: 1)
    let image = UIGraphicsImageRenderer(size: size, format: format).pngData { renderer in
      let context = renderer.cgContext
      UIColor(white: 0.08, alpha: 1).setFill()
      renderer.fill(CGRect(origin: .zero, size: size))
      let colors = [UIColor(red: 0.19, green: 0.15, blue: 0.21, alpha: 1).cgColor,
                    UIColor(white: 0.055, alpha: 1).cgColor] as CFArray
      if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(), colors: colors, locations: nil) {
        context.drawLinearGradient(gradient, start: .zero, end: CGPoint(x: size.width, y: size.height), options: [])
      }
      func text(_ value: String, _ x: CGFloat, _ y: CGFloat, _ size: CGFloat, _ color: UIColor = .white) {
        (value as NSString).draw(at: CGPoint(x: x, y: y), withAttributes: [
          .font: UIFont.systemFont(ofSize: size, weight: .bold), .foregroundColor: color,
        ])
      }
      text("\(alert.symbol) · MetaMask", 24, 18, 20)
      text(PriceAlert.usd(alert.price), 24, 48, 38)
      text("\(alert.change >= 0 ? "+" : "")\(alert.change)%", 440, 59, 27, tint)
      let low = prices.min() ?? alert.price
      let high = prices.max() ?? alert.price
      let floor = min(low, alert.target ?? low)
      let range = max(high, alert.target ?? high) - floor
      let width: CGFloat = alert.target == nil ? 552 : 430
      func y(_ price: Double) -> CGFloat { range == 0 ? 181 : 240 - CGFloat((price - floor) / range) * 126 }
      let points = prices.enumerated().map { CGPoint(x: 24 + CGFloat($0.offset) / CGFloat(prices.count - 1) * width, y: y($0.element)) }
      if let target = alert.target {
        let line = UIBezierPath()
        line.move(to: CGPoint(x: 24, y: y(target)))
        line.addLine(to: CGPoint(x: 460, y: y(target)))
        line.setLineDash([5, 5], count: 2, phase: 0)
        UIColor.lightGray.setStroke()
        line.stroke()
        text(PriceAlert.usd(target), 470, y(target) - 10, 17)
      }
      let curve = UIBezierPath()
      curve.move(to: points[0])
      for index in 1..<points.count {
        let previous = points[index - 1]
        let point = points[index]
        let middle = (previous.x + point.x) / 2
        curve.addCurve(to: point, controlPoint1: CGPoint(x: middle, y: previous.y),
                       controlPoint2: CGPoint(x: middle, y: point.y))
      }
      tint.setStroke()
      curve.lineWidth = 4
      curve.stroke()
      tint.setFill()
      for index in Set([prices.firstIndex(of: low), prices.firstIndex(of: high), prices.indices.last].compactMap { $0 }) {
        let point = points[index]
        UIBezierPath(ovalIn: CGRect(x: point.x - 4, y: point.y - 4, width: 8, height: 8)).fill()
      }
      text("24h", 24, 262, 17)
      text("High \(PriceAlert.usd(high)) · Low \(PriceAlert.usd(low))", 245, 262, 17)
    }
    let directory = FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString, isDirectory: true)
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    let file = directory.appendingPathComponent("price-chart.png")
    do {
      try image.write(to: file, options: .atomic)
      return try UNNotificationAttachment(identifier: "price-chart", url: file)
    } catch {
      try? FileManager.default.removeItem(at: directory)
      throw error
    }
  }
}
