const Stream = require('stream')
const Koa = require('koa')
const axios = require('axios').default
const assert = require('assert')
const ReadableStream = require('stream').Readable

const rawBody = require('./lib/rawbody').getBody

const { UrlConvertor } = require('./lib/utils')

class Selector {
    constructor(targets) {
        this._targetIndex = 0
        assert.equal(targets instanceof Array, true)
        this.targets = UrlConvertor(targets)
        this.select = this.select.bind(this)
    }

    select() {
        const len = this.targets.length
        if (this._targetIndex >= len) {
            this._targetIndex = 0
        }
        const target = this.targets[this._targetIndex]
        this._targetIndex++
        return target
    }
}

class EasyProxy extends Koa {
    constructor(options) {
        super()
        this.options = options || {}
        Object.keys(this.options.urlmap).forEach(path => {
            console.log(path, this.options.urlmap[path])
            this.options.urlmap[path] = new Selector(this.options.urlmap[path])
            
        })

        this.setUp = this.setUp.bind(this)
        this.fromMap = this.fromMap.bind(this)

        //for round-robin
        this._targetIndex = 0

        //setup target for Proxy
        this.setUp()
    }

    fromMap(path) {
        return this.options.urlmap[path].select()
    }

    setUp() {
        this.use(async (ctx, next) => {
            try {
                let result = await rawBody(ctx.req)

                const target = this.fromMap(ctx.url)

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

                ctx.set('Content-type', 'plain/text')
                await next()

                //if user specify their own onResponse function
                const resultFromUser =
                    this.options.onResponse &&
                    (await this.options.onResponse(ctx, res.data))
                if (resultFromUser) {
                    ctx.body = resultFromUser
                } else {
                    ctx.body = res.data
                }
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
