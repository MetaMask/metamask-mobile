package io.metamask.nativeModules.PerfSession

import com.facebook.react.modules.network.NetworkingModule
import com.facebook.react.modules.network.OkHttpClientProvider
import okhttp3.Call
import okhttp3.Connection
import okhttp3.EventListener
import okhttp3.Handshake
import okhttp3.HttpUrl
import okhttp3.Interceptor
import okhttp3.MediaType
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.RequestBody
import okhttp3.Response
import okio.Buffer
import okio.BufferedSink
import okio.ForwardingSink
import okio.buffer
import org.json.JSONObject
import java.io.IOException
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.Proxy
import java.util.concurrent.ConcurrentHashMap

/**
 * Timing of every request JS makes with fetch / XMLHttpRequest (React Native's
 * NetworkingModule; image loads and WebViews are not included). The `network` feature.
 *
 * Per request: host, a path template (ids, keys and addresses replaced with `:id`, no
 * query string), HTTP method, the JSON-RPC method for RPC calls, status or error, and
 * where the time went: queued in OkHttp's dispatcher (at most 5 requests per host run
 * at once), DNS, connect, TLS, time to first byte, total. Headers and bodies are never
 * recorded; only the JSON-RPC `method` name is read from small JSON bodies.
 */
internal object PerfNetwork {
    /** Set from the sampler thread; read on OkHttp threads. */
    @Volatile
    var enabled = false

    private const val MAX_RPC_BODY_BYTES = 64 * 1024L
    private const val RPC_PEEK_BYTES = 2048L
    private const val MAX_PATH_SEGMENTS = 8
    private const val MAX_OPEN_CALLS = 500
    private val RPC_METHOD = Regex("\"method\"\\s*:\\s*\"([A-Za-z0-9_]{1,64})\"")
    private val HEX_ID = Regex("^(0x)?[0-9a-fA-F]{8,}$")
    private val PLAIN_SEGMENT = Regex("^[A-Za-z0-9._~:-]+$")

    private val calls = ConcurrentHashMap<Call, Timing>()
    private var installed = false

    /** The listener factory the base client had (e.g. Sentry's); every event is forwarded to it. */
    private val baseFactory: EventListener.Factory by lazy {
        runCatching { OkHttpClientProvider.getOkHttpClient().eventListenerFactory }
            .getOrElse { EventListener.Factory { EventListener.NONE } }
    }

    fun install() {
        if (installed) return
        installed = true
        NetworkingModule.setCustomClientBuilder { builder ->
            builder.eventListenerFactory { call ->
                val base = baseFactory.create(call)
                if (enabled) Listener(base) else base
            }
            builder.addInterceptor(RpcMethodInterceptor)
        }
    }

    private class Timing(val startNs: Long, val t: Long, val mono: Long, val screen: String) {
        var firstNetworkNs = 0L
        var dnsStartNs = 0L
        var dnsNs = -1L
        var connectStartNs = 0L
        var connectNs = -1L
        var tlsStartNs = 0L
        var tlsNs = -1L
        var ttfbNs = -1L
        var status = -1
        var protocol: String? = null
        var reqBytes = -1L
        var resBytes = -1L
        var rpcPeek: Buffer? = null
        var done = false
    }

    /**
     * Copies the first bytes of a small JSON body as OkHttp writes it, so the JSON-RPC
     * method can be read without writing the body twice (React Native's body wrapper
     * reports upload progress to JS on every write).
     */
    private object RpcMethodInterceptor : Interceptor {
        override fun intercept(chain: Interceptor.Chain): Response {
            val request = chain.request()
            val timing = calls[chain.call()]
            val body = request.body
            if (timing == null || body == null || !isJson(body.contentType())) return chain.proceed(request)
            val length = runCatching { body.contentLength() }.getOrDefault(-1L)
            if (length <= 0 || length > MAX_RPC_BODY_BYTES) return chain.proceed(request)
            val peek = Buffer()
            timing.rpcPeek = peek
            return chain.proceed(request.newBuilder().method(request.method, PeekingBody(body, peek)).build())
        }

        private fun isJson(type: MediaType?) = type != null && type.subtype.contains("json", ignoreCase = true)
    }

    private class PeekingBody(private val body: RequestBody, private val peek: Buffer) : RequestBody() {
        override fun contentType() = body.contentType()
        override fun contentLength() = body.contentLength()
        override fun isOneShot() = body.isOneShot()
        override fun isDuplex() = body.isDuplex()

        override fun writeTo(sink: BufferedSink) {
            val tee = object : ForwardingSink(sink) {
                override fun write(source: Buffer, byteCount: Long) {
                    val room = RPC_PEEK_BYTES - peek.size
                    if (room > 0) source.copyTo(peek, 0, minOf(room, byteCount))
                    super.write(source, byteCount)
                }
            }.buffer()
            body.writeTo(tee)
            tee.emit()
        }
    }

    private class Listener(private val base: EventListener) : EventListener() {
        private fun timing(call: Call) = calls[call]
        private fun now() = System.nanoTime()
        private fun markNetwork(call: Call) {
            val t = timing(call) ?: return
            if (t.firstNetworkNs == 0L) t.firstNetworkNs = now()
        }

        override fun callStart(call: Call) {
            // A response body nobody closes never ends its call; don't let those pile up.
            if (calls.size > MAX_OPEN_CALLS) calls.clear()
            calls[call] = Timing(now(), System.currentTimeMillis(), PerfSession.monoUs(), PerfSession.screen)
            base.callStart(call)
        }

        override fun proxySelectStart(call: Call, url: HttpUrl) {
            markNetwork(call)
            base.proxySelectStart(call, url)
        }

        override fun proxySelectEnd(call: Call, url: HttpUrl, proxies: List<Proxy>) = base.proxySelectEnd(call, url, proxies)

        override fun dnsStart(call: Call, domainName: String) {
            markNetwork(call)
            timing(call)?.dnsStartNs = now()
            base.dnsStart(call, domainName)
        }

        override fun dnsEnd(call: Call, domainName: String, inetAddressList: List<InetAddress>) {
            timing(call)?.let { if (it.dnsStartNs > 0) it.dnsNs = now() - it.dnsStartNs }
            base.dnsEnd(call, domainName, inetAddressList)
        }

        override fun connectStart(call: Call, inetSocketAddress: InetSocketAddress, proxy: Proxy) {
            markNetwork(call)
            timing(call)?.connectStartNs = now()
            base.connectStart(call, inetSocketAddress, proxy)
        }

        override fun secureConnectStart(call: Call) {
            timing(call)?.tlsStartNs = now()
            base.secureConnectStart(call)
        }

        override fun secureConnectEnd(call: Call, handshake: Handshake?) {
            timing(call)?.let { if (it.tlsStartNs > 0) it.tlsNs = now() - it.tlsStartNs }
            base.secureConnectEnd(call, handshake)
        }

        override fun connectEnd(call: Call, inetSocketAddress: InetSocketAddress, proxy: Proxy, protocol: Protocol?) {
            timing(call)?.let { if (it.connectStartNs > 0) it.connectNs = now() - it.connectStartNs }
            base.connectEnd(call, inetSocketAddress, proxy, protocol)
        }

        override fun connectFailed(call: Call, inetSocketAddress: InetSocketAddress, proxy: Proxy, protocol: Protocol?, ioe: IOException) =
            base.connectFailed(call, inetSocketAddress, proxy, protocol, ioe)

        override fun connectionAcquired(call: Call, connection: Connection) {
            markNetwork(call)
            timing(call)?.protocol = connection.protocol().toString()
            base.connectionAcquired(call, connection)
        }

        override fun connectionReleased(call: Call, connection: Connection) = base.connectionReleased(call, connection)
        override fun requestHeadersStart(call: Call) = base.requestHeadersStart(call)
        override fun requestHeadersEnd(call: Call, request: Request) = base.requestHeadersEnd(call, request)
        override fun requestBodyStart(call: Call) = base.requestBodyStart(call)

        override fun requestBodyEnd(call: Call, byteCount: Long) {
            timing(call)?.reqBytes = byteCount
            base.requestBodyEnd(call, byteCount)
        }

        override fun requestFailed(call: Call, ioe: IOException) = base.requestFailed(call, ioe)

        override fun responseHeadersStart(call: Call) {
            timing(call)?.let { if (it.ttfbNs < 0) it.ttfbNs = now() - it.startNs }
            base.responseHeadersStart(call)
        }

        override fun responseHeadersEnd(call: Call, response: Response) {
            timing(call)?.status = response.code
            base.responseHeadersEnd(call, response)
        }

        override fun responseBodyStart(call: Call) = base.responseBodyStart(call)

        override fun responseBodyEnd(call: Call, byteCount: Long) {
            timing(call)?.resBytes = byteCount
            base.responseBodyEnd(call, byteCount)
        }

        override fun responseFailed(call: Call, ioe: IOException) = base.responseFailed(call, ioe)

        override fun callEnd(call: Call) {
            finish(call, null)
            base.callEnd(call)
        }

        override fun callFailed(call: Call, ioe: IOException) {
            finish(call, ioe.javaClass.simpleName.ifEmpty { "IOException" })
            base.callFailed(call, ioe)
        }

        override fun canceled(call: Call) {
            finish(call, "Canceled")
            base.canceled(call)
        }

        override fun satisfactionFailure(call: Call, response: Response) = base.satisfactionFailure(call, response)
        override fun cacheHit(call: Call, response: Response) = base.cacheHit(call, response)
        override fun cacheMiss(call: Call) = base.cacheMiss(call)
        override fun cacheConditionalHit(call: Call, cachedResponse: Response) = base.cacheConditionalHit(call, cachedResponse)

        private fun finish(call: Call, error: String?) {
            val t = calls.remove(call) ?: return
            if (t.done) return
            t.done = true
            runCatching { record(call.request(), t, error) }.getOrNull()?.let(PerfSession::onRequest)
        }
    }

    private fun ms(ns: Long) = Math.round(ns / 100_000.0) / 10.0

    private fun record(request: Request, t: Timing, error: String?): JSONObject? {
        val url = request.url
        val host = PerfSanitize.text(url.host.lowercase(), 100) ?: return null
        val out = JSONObject()
            .put("t", t.t)
            .put("mono", t.mono)
            .put("screen", t.screen)
            .put("method", request.method)
            .put("host", host)
            .put("path", pathTemplate(url.encodedPathSegments))
            .put("durationMs", ms(System.nanoTime() - t.startNs))
        if (t.firstNetworkNs > 0) out.put("queueMs", ms(t.firstNetworkNs - t.startNs))
        if (t.dnsNs >= 0) out.put("dnsMs", ms(t.dnsNs))
        if (t.connectNs >= 0) out.put("connectMs", ms(t.connectNs))
        if (t.tlsNs >= 0) out.put("tlsMs", ms(t.tlsNs))
        if (t.ttfbNs >= 0) out.put("ttfbMs", ms(t.ttfbNs))
        if (t.status >= 0) out.put("status", t.status)
        if (error != null) out.put("error", PerfSanitize.text(error, 40) ?: "IOException")
        t.protocol?.let { out.put("protocol", it) }
        if (t.reqBytes >= 0) out.put("reqBytes", t.reqBytes)
        if (t.resBytes >= 0) out.put("resBytes", t.resBytes)
        t.rpcPeek?.let { peek ->
            val methods = RPC_METHOD.findAll(peek.readUtf8()).map { it.groupValues[1] }.toList()
            if (methods.isNotEmpty()) {
                out.put("rpc", methods.first())
                if (methods.size > 1) out.put("rpcCount", methods.size)
            }
        }
        return out
    }

    /**
     * `/v2/accounts/0xabc…/balances` → `/v2/accounts/:id/balances`. Segments that look like
     * ids, keys, addresses or numbers become `:id`, so the path names the endpoint only.
     */
    internal fun pathTemplate(segments: List<String>): String {
        val parts = segments.filter { it.isNotEmpty() }.take(MAX_PATH_SEGMENTS).map { segment ->
            val digits = segment.count { it.isDigit() }
            when {
                segment.length > 32 -> ":id"
                digits >= 4 -> ":id"
                HEX_ID.matches(segment) -> ":id"
                !PLAIN_SEGMENT.matches(segment) -> ":id"
                else -> segment
            }
        }
        val more = if (segments.count { it.isNotEmpty() } > MAX_PATH_SEGMENTS) "/..." else ""
        return "/" + parts.joinToString("/") + more
    }
}
