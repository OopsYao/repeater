const elStatus = document.getElementById('status')
const elQr = document.getElementById('qr')

const wsStatus = new WebSocket('ws://localhost:8080/status')
wsStatus.addEventListener('open', () => {
  wsStatus.send(JSON.stringify(123))
})
wsStatus.addEventListener('message', ({ data }) => {
  const status = JSON.parse(data)
  if (status === 'logout') {
    elQr.style.display = 'block'
    elStatus.style.display = 'none'
  } else {
    elQr.style.display = 'none'
    elStatus.style.display = 'block'
    elStatus.textContent = `You've already logged in.`
  }
})

const wsQr = new WebSocket('ws://localhost:8080/qr')
const qr = new QRCode(document.getElementById('qr'), {})
wsQr.addEventListener('message', ({ data }) => {
  const qrcode = JSON.parse(data)
  qr.clear()
  qr.makeCode(qrcode)
})
wsQr.addEventListener('open', () => {
  wsQr.send(JSON.stringify(123))
})
