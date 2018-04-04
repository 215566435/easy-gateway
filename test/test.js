const { UrlConvertor } = require('../src/lib/utils')

const http = require('http')
const EasyProxy = require('../src/index')
const { expect } = require('chai')
const request = require('supertest')
const assert = require('assert')

function startProxyServer(opts) {
    return new Promise((resolve, reject) => {
        const px = new EasyProxy(opts)
        const re = px.run(3000, () => {
            resolve(re)
        })
    })
}

// 创建演示服务器
function startExampleServer(port) {
    return new Promise((resolve, reject) => {
        const server = http.createServer(function(req, res) {
            const chunks = []
            req.on('data', chunk => chunks.push(chunk))
            req.on('end', () => {
                const buf = Buffer.concat(chunks)
                res.end(
                    `${port}: ${req.method} ${req.url} ${buf.toString()}`.trim()
                )
            })
        })
        server.listen(port, () => {
            resolve(server)
        })
        server.on('error', reject)
    })
}

describe('测试反向代理', function() {
    let server
    let exampleServers = []

    // 测试开始前先启动服务器
    before(async function() {
        exampleServers.push(await startExampleServer(3001))
        exampleServers.push(await startExampleServer(3002))
        exampleServers.push(await startExampleServer(3003))
        server = await startProxyServer({
            targets: ['127.0.0.1:3001', '127.0.0.1:3002', '127.0.0.1:3003'],
            onResponse: async (ctx, resFromRemote) => {
                return resFromRemote
            }
        })
    })

    // 测试结束后关闭服务器
    after(async function() {
        for (const sr of exampleServers) {
            sr.close()
        }
        server.close()
    })

    it('顺序循环返回目标地址', async function() {
        await request(server)
            .get('/hello')
            .expect(200)
            .expect(`3001: GET /hello`)

        await request(server)
            .get('/api/hello')
            .expect(200)
            .expect(`3002: GET /api/hello`)

        await request(server)
            .get('/hello')
            .expect(200)
            .expect(`3003: GET /hello`)

        await request(server)
            .get('/hello')
            .expect(200)
            .expect(`3001: GET /hello`)
    })

    it('支持 POST 请求', async function() {
        await request(server)
            .post('/xyz')
            .send({
                a: 123,
                b: 456
            })
            .expect(200)
            .expect(`3002: POST /xyz {"a":123,"b":456}`)
    })
})

describe('工具类测试', function() {
    it('判断url是否有http/https', () => {
        const i = UrlConvertor(['127.0.0.1:3001', '127.0.0.1:3002'])
        i.forEach(url => {
            assert(/http/.test(url) === true)
        })

        const u = UrlConvertor([
            'http://127.0.0.1:3001',
            'https://127.0.0.1:3002'
        ])
        u.forEach(url => {
            assert(/http/.test(url) === true)
        })
    })
})
