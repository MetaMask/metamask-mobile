package io.metamask.nativeModules.PerfSession

import org.json.JSONObject

/**
 * Optional sampler features, switched per env by the collector's `GET /status`
 * (`features`). A feature missing from the answer, or `false`, is off.
 */
internal data class PerfFeatures(
    val spans: Boolean = false,
    val interactions: Boolean = false,
    val framePhases: Boolean = false,
    val redux: Boolean = false,
    val jsLag: Boolean = false,
    val uiStalls: Boolean = false,
    val profiles: Boolean = false,
    val renderLoops: Boolean = false,
    val maxProfilesPerHour: Int = DEFAULT_MAX_PROFILES_PER_HOUR,
) {
    fun names(): List<String> = listOfNotNull(
        "spans".takeIf { spans },
        "interactions".takeIf { interactions },
        "framePhases".takeIf { framePhases },
        "redux".takeIf { redux },
        "jsLag".takeIf { jsLag },
        "uiStalls".takeIf { uiStalls },
        "profiles".takeIf { profiles },
        "renderLoops".takeIf { renderLoops },
    )

    /** The features JS has to act on (see app/core/Performance/perfSession.ts). */
    fun jsJson(): String = JSONObject()
        .put("spans", spans)
        .put("redux", redux)
        .put("jsLag", jsLag)
        .toString()

    companion object {
        const val DEFAULT_MAX_PROFILES_PER_HOUR = 12
        val NONE = PerfFeatures()

        fun from(json: JSONObject?): PerfFeatures {
            if (json == null) return NONE
            val profiles = json.opt("profiles")
            val profilesEnabled = when (profiles) {
                is Boolean -> profiles
                is JSONObject -> profiles.optBoolean("enabled", false)
                else -> false
            }
            val maxPerHour = (profiles as? JSONObject)
                ?.optInt("maxPerHour", DEFAULT_MAX_PROFILES_PER_HOUR)
                ?: DEFAULT_MAX_PROFILES_PER_HOUR
            return PerfFeatures(
                spans = json.optBoolean("spans", false),
                interactions = json.optBoolean("interactions", false),
                framePhases = json.optBoolean("framePhases", false),
                redux = json.optBoolean("redux", false),
                jsLag = json.optBoolean("jsLag", false),
                uiStalls = json.optBoolean("uiStalls", false),
                profiles = profilesEnabled,
                renderLoops = json.optBoolean("renderLoops", false),
                maxProfilesPerHour = maxPerHour.coerceIn(0, 120),
            )
        }
    }
}

/** Keeps anything that could carry user data out of the payload (CONTRACT.md). */
internal object PerfSanitize {
    private val HEX = Regex("0x[0-9a-fA-F]{6,}")
    private val DIGITS = Regex("[0-9]{6,}")

    /** Printable ASCII, at most [max] characters; null when empty or it looks like user data. */
    fun text(value: String?, max: Int): String? {
        if (value.isNullOrEmpty()) return null
        if (HEX.containsMatchIn(value) || DIGITS.containsMatchIn(value)) return null
        val printable = buildString(minOf(value.length, max)) {
            for (c in value) {
                if (length >= max) break
                if (c in ' '..'~') append(c)
            }
        }
        return printable.trim().ifEmpty { null }
    }
}
