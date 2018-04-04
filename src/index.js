const rawBody = require('./lib/rawbody').getBody
const Stream = require('stream')
const Koa = require('koa')
const axios = require('axios').default
const assert = require('assert')
const ReadableStream = require('stream').Readable

const UrlConvertor = targets => {
    return targets.map(url => {
        if (/http/.test(url) || /https/.test(url)) {
            return url
        }
        return `http://${url}`
    })
}

class EasyProxy extends Koa {
    constructor(options) {
        super()
        this.options = options || {}
        assert.equal(this.options.targets instanceof Array, true)

        this.options.targets = UrlConvertor(this.options.targets)

        this.setUp = this.setUp.bind(this)

        //for round-robin
        this._targetIndex = 0

        //setup target for Proxy
        this.setUp()
    }

    selector() {
        const len = this.options.targets.length
        if (this._targetIndex >= len) {
            this._targetIndex = 0
        }
        const target = this.options.targets[this._targetIndex]
        this._targetIndex++
        return target
    }

    setUp() {
        this.use(async (ctx, next) => {
            try {
                let result = await rawBody(ctx.req)

                const target = this.selector()
                const res = await axios({
                    headers: ctx.req.headers,
                    url: target + ctx.url,
                    method: ctx.req.method,
                    data: result,
                    path: ctx.url,
                    responseType: 'stream' //all returning is string
                })

                ctx.set({
                    ...res.headers
                })
                // console.log(` ${ctx.req.method} ${ctx.url} ====> ${target}`)
                ctx.set('Content-type', 'plain/text')
                await next()
                ctx.body = res.data
            } catch (e) {
                console.log(e.message)
                ctx.body = 'server internal error'
                ctx.status = 500
            }
        })
    }

    run(port, fn) {
        return this.listen(port, fn)
    }
}

module.exports = EasyProxy
