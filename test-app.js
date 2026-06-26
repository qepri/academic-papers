const http = require('http')
const app = require('./src/index.js')

setTimeout(function () {
  http.get('http://localhost:3000/api/stats', function (res) {
    var d = ''
    res.on('data', function (c) { d += c })
    res.on('end', function () {
      console.log('Stats:', d.slice(0, 200))
      process.exit(0)
    })
  }).on('error', function (e) {
    console.log('Request error:', e.message)
    process.exit(1)
  })
}, 2000)
