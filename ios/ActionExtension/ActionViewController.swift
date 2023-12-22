//
//  ActionViewController.swift
//  ActionExtension
//
//  Created by Seth Kaufman on 12/22/23.
//  Copyright © 2023 MetaMask. All rights reserved.
//

import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

class ActionViewController: UIViewController {

    @IBOutlet weak var imageView: UIImageView!
    var stringProperty: String?
  
    override func viewDidLoad() {
        super.viewDidLoad()
      
        //Find url selected
        if let item = extensionContext?.inputItems.first as? NSExtensionItem {
            if let itemProvider = item.attachments?.first as? NSItemProvider {
                if itemProvider.hasItemConformingToTypeIdentifier("public.url") {
                    itemProvider.loadItem(forTypeIdentifier: "public.url", options: nil, completionHandler: { (url, error) in
                      if let shareURL = url as? NSURL {
                        // Now you have the URL
                        print(shareURL.absoluteString ?? "")
                        self.stringProperty = shareURL.host
                      }
                    })
                }
            }
        }
        
        // Create a button
        let button = UIButton(type: .system) // Use .system to get a system-styled button

        // Set the button's title for normal state
        button.setTitle("Open in MetaMask", for: .normal)

        // Set the button's action
        button.addTarget(self, action: #selector(self.buttonClicked), for: .touchUpInside)

        // Set the button's frame
        button.frame = CGRect(x: 100, y: 100, width: 200, height: 50)
        // Add the button to the view
        self.view.addSubview(button)
    }


    @objc private func openURL(_ url: URL) -> Bool {
        var responder: UIResponder? = self
        while responder != nil {
            if let application = responder as? UIApplication {
                return application.perform(#selector(openURL(_:)), with: url) != nil
            }
            responder = responder?.next
        }
        return false
    }
    
    @objc func buttonClicked() {
      if let string = self.stringProperty {
        self.extensionContext?.completeRequest(returningItems: nil, completionHandler: { _ in
          guard let url = URL(string: "https://metamask.app.link/" + string) else {
            return
          }
          _ = self.openURL(url)
        })
      }
    }
      
  
    @IBAction func done() {
      let appURL = NSURL(string: "metamask://")

      self.extensionContext?.open(appURL! as URL, completionHandler:nil)
        // Return any edited content to the host app.
        // This template doesn't do anything, so we just echo the passed in items.
        self.extensionContext!.completeRequest(returningItems: self.extensionContext!.inputItems, completionHandler: nil)
    }

}
