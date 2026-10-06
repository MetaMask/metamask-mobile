import Foundation
import WalletExtensionShared

let arguments = CommandLine.arguments
guard arguments.count >= 3, let seconds = Double(arguments[2]) else {
    fputs("usage: lock-holder <directory> <seconds>\n", stderr)
    exit(2)
}

let lock = AppGroupRefreshLock(directory: URL(fileURLWithPath: arguments[1], isDirectory: true))
guard lock.acquire(timeout: 2) else {
    exit(1)
}
Thread.sleep(forTimeInterval: seconds)
lock.release()
