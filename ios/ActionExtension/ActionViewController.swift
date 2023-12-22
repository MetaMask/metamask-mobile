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
      
      
      if let item = extensionContext?.inputItems.first as? NSExtensionItem {
          if let itemProvider = item.attachments?.first as? NSItemProvider {
              if itemProvider.hasItemConformingToTypeIdentifier("public.url") {
                  itemProvider.loadItem(forTypeIdentifier: "public.url", options: nil, completionHandler: { (url, error) in
                    if let shareURL = url as? NSURL {
                      // Now you have the URL
                      print(shareURL.absoluteString ?? "")
                      self.stringProperty = shareURL.absoluteString
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
        button.frame = CGRect(x: 100, y: 100, width: 100, height: 50)

        // Add the button to the view
        self.view.addSubview(button)
      
        // Get the item[s] we're handling from the extension context.
        
        // For example, look for an image and place it into an image view.
        // Replace this with something appropriate for the type[s] your extension supports.

      
        var imageFound = false
        for item in self.extensionContext!.inputItems as! [NSExtensionItem] {
            for provider in item.attachments! {
                if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    // This is an image. We'll load it, then place it in our image view.
                    weak var weakImageView = self.imageView
                    provider.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil, completionHandler: { (imageURL, error) in
                        OperationQueue.main.addOperation {
                            if let strongImageView = weakImageView {
                                if let imageURL = imageURL as? URL {
                                    strongImageView.image = UIImage(data: try! Data(contentsOf: imageURL))
                                }
                            }
                        }
                    })
                    
                    imageFound = true
                    break
                }
            }
            
            if (imageFound) {
                // We only handle one image, so stop looking for more.
                break
            }
        }
    }

    @objc func buttonClicked() {
        if let string = self.stringProperty {
            print("Button clicked with string: \(string)")
            //Create Deeplink
//            let url = "dapp://" + string
            self.extensionContext?.open(URL(string: "https://metamask.app.link/pancakeswap.finance/")! , completionHandler: nil)
           self.extensionContext!.completeRequest(returningItems: self.extensionContext!.inputItems, completionHandler: nil)
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
