exports.getBody = req => {
    return new Promise(function(resolve, reject) {
        let buf = ''
        req.on('data', chunk => {
            buf += chunk
        })
        req.on('end', () => {
            resolve(buf)
        })

        req.on('error', err => {
            reject(err)
        })
    })
}
