// import WebSocket from 'ws'
//
// const client: WebSocket & { pingTimeout?: ReturnType<typeof setTimeout> } =
//   new WebSocket('ws://localhost:3002')
//
// function heartbeat() {
//   clearTimeout(client.pingTimeout)
//   client.pingTimeout = setTimeout(() => {
//     client.terminate()
//   }, 30_000 + 1_000)
// }
//
// client.on('open', () => {
//   heartbeat()
//   client.send(
//     JSON.stringify({
//       action: 'subscribe',
//       trades: ['BTCUSD'],
//       quotes: ['BTCUSD'],
//       bars: ['BTCUSD'],
//     }),
//   )
// })
// client.on('ping', heartbeat)
// client.on('message', (data) => {
//   const message = JSON.parse(data.toString()) as { T: string }
//   if (message.T === 'ready') {
//     client.send(
//       JSON.stringify({
//         action: 'subscribe',
//         trades: ['BTCUSD'],
//         quotes: ['BTCUSD'],
//         bars: ['BTCUSD'],
//       }),
//     )
//   }
//   console.log(message)
// })
// client.on('close', () => {
//   clearTimeout(client.pingTimeout)
// })
