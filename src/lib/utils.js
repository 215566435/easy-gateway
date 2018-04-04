exports.UrlConvertor = function UrlConvertor(targets) {
    return targets.map(function(url) {
        if (/http/.test(url) || /https/.test(url)) {
            return url
        }
        return `http://${url}`
    })
}
