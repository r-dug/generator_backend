function validateUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}
module.exports = validateUrl
// Usage:
// console.log(validateUrl("https://www.google.com")); // Should return true
// console.log(validateUrl("htp://malformed.url")); // Should return false
