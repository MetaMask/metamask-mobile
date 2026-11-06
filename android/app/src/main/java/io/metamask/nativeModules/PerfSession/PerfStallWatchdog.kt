package io.metamask.nativeModules.PerfSession

import android.os.Handler
import android.os.HandlerThread
import android.os.Looper

/**
 * UI-thread stalls for the `uiStalls` feature. Pings the main Looper; when a ping
 * isn't handled within [STALL_MS], samples the main thread's stack every
 * [SAMPLE_MS] until it is, then reports the stall's duration and its most
 * frequent stack. Runs on its own `mm-perf-` thread so its cost counts as selfCpu.
 */
internal object PerfStallWatchdog {
    private const val STALL_MS = 100L
    private const val SAMPLE_MS = 50L
    private const val MAX_FRAMES = 40

    private val mainHandler = Handler(Looper.getMainLooper())
    private var handler: Handler? = null

    // Watchdog-thread state.
    private var active = false
    private var awaiting = false
    private var postedAtNs = 0L
    private var postedAtWall = 0L
    private val stackCounts = HashMap<List<String>, Int>()

    @Volatile
    private var ackedAtNs = 0L

    private val ack = Runnable { ackedAtNs = System.nanoTime() }
    private val checkRunnable = Runnable { check() }

    /** Any thread. */
    fun setActive(value: Boolean) {
        val watchdog = handler ?: if (value) {
            Handler(HandlerThread("${PerfSession.THREAD_PREFIX}watchdog").apply { start() }.looper).also { handler = it }
        } else return
        watchdog.post {
            if (active == value) return@post
            active = value
            awaiting = false
            stackCounts.clear()
            watchdog.removeCallbacks(checkRunnable)
            if (value) watchdog.post(checkRunnable)
        }
    }

    private fun check() {
        if (!active) return
        val now = System.nanoTime()
        if (awaiting) {
            val acked = ackedAtNs
            if (acked >= postedAtNs) {
                val durationMs = (acked - postedAtNs) / 1_000_000
                if (stackCounts.isNotEmpty() && durationMs >= STALL_MS) {
                    val stack = stackCounts.maxByOrNull { it.value }!!.key
                    PerfSession.onStall(postedAtWall, postedAtNs / 1000, durationMs, stack)
                }
                awaiting = false
                stackCounts.clear()
            } else if (now - postedAtNs >= STALL_MS * 1_000_000) {
                val stack = Looper.getMainLooper().thread.stackTrace
                    .take(MAX_FRAMES)
                    .map { it.toString() }
                stackCounts.merge(stack, 1, Int::plus)
            }
        }
        if (!awaiting) {
            awaiting = true
            postedAtNs = System.nanoTime()
            postedAtWall = System.currentTimeMillis()
            mainHandler.post(ack)
            handler?.postDelayed(checkRunnable, STALL_MS)
        } else {
            handler?.postDelayed(checkRunnable, SAMPLE_MS)
        }
    }
}
