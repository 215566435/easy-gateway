const Stream = require('stream')

const Koa = require('koa')
const axios = require('axios').default

const app = new Koa()

app.use(async (ctx, next) => {
    try {
        let result = await getBody(ctx.req)

        const target = 'http://127.0.0.1:7001/api'
        const res = await axios({
            headers: ctx.req.headers,
            url: target,
            method: ctx.req.method,
            path: ctx.url,
            responseType: 'stream' //all returning is string
        })

        ctx.set({
            ...res.headers
        })

        console.log(` ${ctx.req.method} ${ctx.url} ====> ${target}`)

        await next()
        ctx.body = res.data
    } catch (e) {
        console.log(e)
        ctx.body = 'server internal error'
        ctx.status = 500
    }
})

app.listen(3000, () => {
    console.log('koa来了')
})

const getBody = req => {
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
