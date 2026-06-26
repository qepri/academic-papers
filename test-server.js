const express = require('express')
const path = require('path')
const http = require('http')

const app = express()
app.use(express.static(path.join(__dirname, 'public')))
app.get('/api/ping', function (req, res) { res.json({ ok: true }) })

var server = app.listen(3002, function () {
  console.log('listening on 3002')
  // Test with raw http
  http.get('http://localhost:3002/api/ping', function (res) {
    var d = ''
    res.on('data', function (c) { d += c })
    res.on('end', function () {
      console.log('Response:', d)
      server.close()
    })
  }).on('error', function (e) {
    console.log('Request error:', e.message)
    server.close()
  })
})
