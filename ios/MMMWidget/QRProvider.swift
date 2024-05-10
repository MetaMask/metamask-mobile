import Foundation
import UIKit
import CoreImage.CIFilterBuiltins

final class QRProvider {
  static let shared = QRProvider()

  private init() {}
  
  public func generateQR(accountNumber:String, network: String = "1") -> UIImage {
    let context = CIContext()
    let filter = CIFilter.qrCodeGenerator()
    let fullLink = "ethereum:" + accountNumber + "@" + network
    let data = Data(fullLink.utf8)
    filter.setValue(data, forKey: "inputMessage")

    let transform = CGAffineTransform(scaleX: 10, y: 10) // Scale the QR code image

    if let qrCodeImage = filter.outputImage?.transformed(by: transform) {
        if let qrCodeCGImage = context.createCGImage(qrCodeImage, from: qrCodeImage.extent) {
            let image = UIImage(cgImage: qrCodeCGImage)
            return image
        }
    }
    
    // Return a default image if QR code generation fails
    return UIImage(systemName: "xmark.circle") ?? UIImage()
  }
}
