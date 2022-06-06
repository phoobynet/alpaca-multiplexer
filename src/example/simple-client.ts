import WebSocket, { RawData } from 'ws'

const client: WebSocket & { pingTimeout?: ReturnType<typeof setTimeout> } =
  new WebSocket('ws://0.0.0.0:8080')

client.on('open', () => {
  client.send(
    JSON.stringify({
      action: 'subscribe',
      trades: ['BTCUSD'],
    }),
  )
})

client.on('message', (data: RawData) => {
  console.log(JSON.parse(data.toString()))
})

setTimeout(() => {
  client.close()
  process.exit(0)
}, 10_000)
