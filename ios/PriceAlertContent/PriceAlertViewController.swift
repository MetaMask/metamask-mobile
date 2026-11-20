import UIKit
import UserNotifications
import UserNotificationsUI

private extension PriceAlert {
  var trend: UIColor {
    change >= 0 ? UIColor(red: 185/255, green: 243/255, blue: 2/255, alpha: 1)
      : UIColor(red: 1, green: 117/255, blue: 132/255, alpha: 1)
  }
}

private let orange = UIColor(red: 250/255, green: 75/255, blue: 0, alpha: 1)
private let blue = UIColor(red: 139/255, green: 153/255, blue: 1, alpha: 1)
private let muted = UIColor(red: 163/255, green: 164/255, blue: 167/255, alpha: 1)

private func polygon(_ points: [CGPoint], color: UIColor) {
  guard let first = points.first else { return }
  let path = UIBezierPath()
  path.move(to: first)
  points.dropFirst().forEach { path.addLine(to: $0) }
  path.close()
  color.setFill()
  path.fill()
}

private final class Mark: UIView {
  enum Kind { case ethereum, fox }
  private let kind: Kind

  init(_ kind: Kind, size: CGFloat) {
    self.kind = kind
    super.init(frame: .zero)
    backgroundColor = .clear
    isAccessibilityElement = false
    widthAnchor.constraint(equalToConstant: size).isActive = true
    heightAnchor.constraint(equalToConstant: size).isActive = true
  }

  required init?(coder: NSCoder) { nil }

  override func draw(_ rect: CGRect) {
    func facet(_ coordinates: [(CGFloat, CGFloat)], _ color: UIColor) {
      polygon(coordinates.map { CGPoint(x: $0.0 * rect.width, y: $0.1 * rect.height) }, color: color)
    }
    switch kind {
    case .ethereum:
      blue.withAlphaComponent(0.18).setFill()
      UIBezierPath(ovalIn: rect).fill()
      facet([(0.5,0.17),(0.27,0.53),(0.5,0.66)], .white)
      facet([(0.5,0.17),(0.73,0.53),(0.5,0.66)], blue)
      facet([(0.27,0.58),(0.5,0.82),(0.73,0.58),(0.5,0.71)], blue)
    case .fox:
      facet([(0.06,0.07),(0.39,0.30),(0.61,0.30),(0.94,0.07),(0.99,0.71),(0.74,0.85),(0.59,0.96),(0.41,0.96),(0.26,0.85),(0.01,0.71)], orange)
      let light = UIColor(red: 1, green: 0.52, blue: 0.26, alpha: 1)
      facet([(0.06,0.07),(0.39,0.30),(0.29,0.62),(0.01,0.71)], light)
      facet([(0.94,0.07),(0.61,0.30),(0.71,0.62),(0.99,0.71)], light)
      facet([(0.26,0.85),(0.29,0.62),(0.50,0.77),(0.71,0.62),(0.74,0.85),(0.59,0.96),(0.41,0.96)], light)
      facet([(0.23,0.57),(0.41,0.63),(0.29,0.67)], .black)
      facet([(0.77,0.57),(0.59,0.63),(0.71,0.67)], .black)
      facet([(0.41,0.82),(0.59,0.82),(0.50,0.89)], .black)
    }
  }
}

private final class CardSurface: UIView {
  override func draw(_ rect: CGRect) {
    guard let context = UIGraphicsGetCurrentContext() else { return }
    let outline = UIBezierPath(roundedRect: rect.insetBy(dx: 0.5, dy: 0.5), cornerRadius: 20)
    UIColor(white: 0.04, alpha: 1).setFill()
    outline.fill()
    context.saveGState()
    outline.addClip()
    for (color, opacity, center) in [(orange, 0.28, CGPoint.zero), (blue, 0.2, CGPoint(x: rect.maxX, y: rect.maxY))] {
      if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                   colors: [color.withAlphaComponent(opacity).cgColor, color.withAlphaComponent(0).cgColor] as CFArray,
                                   locations: [0, 1]) {
        context.drawRadialGradient(gradient, startCenter: center, startRadius: 0,
                                   endCenter: center, endRadius: rect.width * 0.70, options: [])
      }
    }
    context.restoreGState()
    UIColor(red: 226/255, green: 226/255, blue: 1, alpha: 0.15).setStroke()
    outline.stroke()
  }
}


final class PriceAlertViewController: UIViewController, UNNotificationContentExtension {
  func didReceive(_ notification: UNNotification) {
    let content = notification.request.content
    view.subviews.forEach { $0.removeFromSuperview() }
    view.backgroundColor = UIColor(white: 0.04, alpha: 1)
    let surface = CardSurface(frame: view.bounds)
    surface.backgroundColor = .clear
    surface.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    surface.contentMode = .redraw
    view.addSubview(surface)
    let stack = UIStackView()
    stack.axis = .vertical
    stack.spacing = 10
    stack.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(stack)
    NSLayoutConstraint.activate([
      stack.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
      stack.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
      stack.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
    ])
    guard let alert = PriceAlert(content.userInfo) else {
      extensionContext?.notificationActions = []
      stack.addArrangedSubview(label(content.title, size: 19, color: .white, weight: .bold))
      stack.addArrangedSubview(label(content.body, size: 15, color: .white))
      preferredContentSize = CGSize(width: view.bounds.width, height: 136)
      return
    }

    let header = UIStackView()
    header.spacing = 10
    header.alignment = .center
    let isEthereum = alert.asset == "eip155:1/slip44:60"
    if isEthereum {
      header.addArrangedSubview(Mark(.ethereum, size: 32))
    }
    let name = isEthereum ? "\(alert.symbol) · Ethereum" : alert.symbol
    let token = label(name, size: 14, color: .white, weight: .semibold)
    header.addArrangedSubview(token)
    header.addArrangedSubview(UIView())
    header.addArrangedSubview(Mark(.fox, size: 21))
    stack.addArrangedSubview(header)

    let priceRow = UIStackView()
    priceRow.alignment = .center
    priceRow.spacing = 8
    let price = label(PriceAlert.usd(alert.price), size: 37, color: .white, weight: .bold)
    price.adjustsFontSizeToFitWidth = true
    price.minimumScaleFactor = 0.6
    price.numberOfLines = 1
    priceRow.addArrangedSubview(price)
    let formattedChange = alert.change.formatted(.number.precision(.fractionLength(0...2)))
    let prefix = alert.change >= 0 ? "+" : ""
    let chip = label("  \(alert.change >= 0 ? "▲" : "▼") \(prefix)\(formattedChange)%  ", size: 13, color: alert.trend, weight: .bold)
    chip.backgroundColor = alert.trend.withAlphaComponent(0.16)
    chip.layer.cornerRadius = 12
    chip.clipsToBounds = true
    chip.setContentCompressionResistancePriority(.required, for: .horizontal)
    chip.heightAnchor.constraint(equalToConstant: 24).isActive = true
    priceRow.addArrangedSubview(chip)
    stack.addArrangedSubview(priceRow)
    stack.addArrangedSubview(label(alert.description, size: 14, color: muted))

    let graph = Sparkline(alert: alert)
    graph.heightAnchor.constraint(equalToConstant: 104).isActive = true
    stack.addArrangedSubview(graph)
    preferredContentSize = CGSize(width: view.bounds.width, height: 250)
  }

  private func label(_ text: String, size: CGFloat, color: UIColor, weight: UIFont.Weight = .regular) -> UILabel {
    let label = UILabel()
    label.text = text
    label.font = .systemFont(ofSize: size, weight: weight)
    label.textColor = color
    label.numberOfLines = 2
    return label
  }
}

private final class Sparkline: UIView {
  private let alert: PriceAlert

  init(alert: PriceAlert) {
    self.alert = alert
    super.init(frame: .zero)
    backgroundColor = .clear
    isAccessibilityElement = false
  }

  required init?(coder: NSCoder) { nil }

  override func draw(_ rect: CGRect) {
    let values = alert.points + [alert.target].compactMap { $0 }
    guard let minimum = values.min(), let maximum = values.max() else { return }
    guard let context = UIGraphicsGetCurrentContext() else { return }
    let chart = rect.insetBy(dx: 9, dy: 13)
    func y(_ value: Double) -> CGFloat {
      let fraction = maximum == minimum ? 0.5 : (value - minimum) / (maximum - minimum)
      return chart.maxY - chart.height * fraction
    }
    if let target = alert.target {
      let marker = UIBezierPath()
      marker.move(to: CGPoint(x: chart.minX, y: y(target)))
      marker.addLine(to: CGPoint(x: chart.maxX, y: y(target)))
      marker.setLineDash([4, 5], count: 2, phase: 0)
      orange.withAlphaComponent(0.8).setStroke()
      marker.stroke()
    }
    let positions = alert.points.enumerated().map { index, value in
      CGPoint(x: chart.minX + chart.width * CGFloat(index) / CGFloat(alert.points.count - 1), y: y(value))
    }
    guard let first = positions.first, let last = positions.last else { return }
    let line = UIBezierPath()
    line.move(to: first)
    for (start, end) in zip(positions, positions.dropFirst()) {
      let third = (end.x - start.x) / 3
      line.addCurve(to: end, controlPoint1: CGPoint(x: start.x + third, y: start.y),
                    controlPoint2: CGPoint(x: end.x - third, y: end.y))
    }
    let fill = UIBezierPath(cgPath: line.cgPath)
    fill.addLine(to: CGPoint(x: last.x, y: chart.maxY))
    fill.addLine(to: CGPoint(x: first.x, y: chart.maxY))
    fill.close()
    context.saveGState()
    fill.addClip()
    if let gradient = CGGradient(colorsSpace: CGColorSpaceCreateDeviceRGB(),
                                 colors: [alert.trend.withAlphaComponent(0.32).cgColor, alert.trend.withAlphaComponent(0).cgColor] as CFArray,
                                 locations: [0, 1]) {
      context.drawLinearGradient(gradient, start: CGPoint(x: 0, y: chart.minY),
                                 end: CGPoint(x: 0, y: chart.maxY), options: [])
    }
    context.restoreGState()
    line.lineWidth = 3
    line.lineCapStyle = .round
    alert.trend.setStroke()
    line.stroke()
    context.saveGState()
    context.setShadow(offset: .zero, blur: 8, color: alert.trend.cgColor)
    alert.trend.setFill()
    UIBezierPath(ovalIn: CGRect(x: last.x - 3.5, y: last.y - 3.5, width: 7, height: 7)).fill()
    context.restoreGState()
    if let target = alert.target {
      let text = "Target \(PriceAlert.usd(target).replacingOccurrences(of: ".00", with: "", options: .anchored.union(.backwards)))" as NSString
      let attributes: [NSAttributedString.Key: Any] = [.font: UIFont.systemFont(ofSize: 10, weight: .semibold), .foregroundColor: UIColor(red: 1, green: 0.64, blue: 0.45, alpha: 1)]
      let size = text.size(withAttributes: attributes)
      let baseline = y(target)
      let pill = CGRect(x: chart.minX, y: max(0, baseline - 19), width: size.width + 12, height: 17)
      UIColor(red: 0.19, green: 0.10, blue: 0.07, alpha: 1).setFill()
      UIBezierPath(roundedRect: pill, cornerRadius: 8.5).fill()
      text.draw(at: CGPoint(x: pill.minX + 6, y: pill.midY - size.height / 2), withAttributes: attributes)
    }
  }
}
