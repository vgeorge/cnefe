const MINOR_WORDS = new Set(["de", "da", "do", "das", "dos", "e"]);

/**
 * Convert a Brazilian street name as stored by IBGE (usually ALL CAPS)
 * into an OSM-convention Title-Cased string.
 *
 * @param {string} raw
 * @returns {string}
 */
export function toOsmCase(raw) {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const tokens = trimmed.split(/\s+/);

  return tokens
    .map((token, index) => {
      // 1. All-digit token: keep exactly as-is.
      if (/^\d+$/.test(token)) return token;

      // 2. Roman numeral: uppercase form matches the pattern.
      //    NOTE: the {1,4} cap is deliberate to avoid mis-catching real
      //    words like CIVIL. This is a documented, accepted limitation.
      const upper = token.toUpperCase();
      if (/^[IVXLCDM]{1,4}$/.test(upper)) return upper;

      // 3. Minor word (not the first token).
      if (index !== 0 && MINOR_WORDS.has(token.toLowerCase())) {
        return token.toLowerCase();
      }

      // 4. Otherwise capitalize: first char up, rest down (accent-aware).
      return token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();
    })
    .join(" ");
}
