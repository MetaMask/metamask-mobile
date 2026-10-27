import Darwin
import Foundation

enum RefreshLockError: Error {
    case unavailable
}

/// `flock(2)`. Kept off the `flock` struct name that Darwin also exports.
@_silgen_name("flock")
private func refreshFileLock(_ fd: Int32, _ operation: Int32) -> Int32

public final class AppGroupRefreshLock {
    private let fileURL: URL
    private var fd: Int32 = -1

    public init(directory: URL) {
        self.fileURL = directory.appendingPathComponent("card-refresh.lock")
    }

    /// Exclusive lock for this open file. A second open in the same process
    /// waits, which `fcntl` record locks do not do.
    public func acquire(timeout: TimeInterval) -> Bool {
        if fd >= 0 { return true }
        let path = fileURL.path
        let opened = open(path, O_CREAT | O_RDWR, S_IRUSR | S_IWUSR)
        guard opened >= 0 else { return false }
        let deadline = Date().addingTimeInterval(timeout)
        while true {
            if refreshFileLock(opened, LOCK_EX | LOCK_NB) == 0 {
                fd = opened
                return true
            }
            if Date() >= deadline {
                close(opened)
                return false
            }
            usleep(50_000)
        }
    }

    public func release() {
        guard fd >= 0 else { return }
        _ = refreshFileLock(fd, LOCK_UN)
        close(fd)
        fd = -1
    }
}
