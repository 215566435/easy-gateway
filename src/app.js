const EasyProxy = require('./')

const app = new EasyProxy({
    targets: ['http://127.0.0.1:7001/api']
})

app.run(3000, () => {
    console.log('开跑')
})
