import WebSocket, { RawData, WebSocketServer } from 'ws'
import { v4 as uuid } from 'uuid'
import { logger } from './logger'
import { AlpacaSocket } from './alpacaSocket'
import { Request, Message, SubscriptionMessage } from './types'
import { getConfiguration } from './getConfiguration'

let readyForSubscriptions = false
const socketMap = new Map<string, WebSocket>()

const wss = new WebSocketServer({
  port: getConfiguration().port,
})

const alpacaSocket = AlpacaSocket.instance()

alpacaSocket.on(
  AlpacaSocket.SUBSCRIPTION_EVENT,
  (subscription: SubscriptionMessage) => {
    console.log(subscription)
  },
)
alpacaSocket.on(AlpacaSocket.MESSAGES_EVENT, (messages: Message[]) => {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify(messages))
  })
})
alpacaSocket.on(AlpacaSocket.ERROR_EVENT, (error: Error) => {
  console.log('AlpacaSocket.Error:' + error)
  logger.error(error)
})

alpacaSocket.on(AlpacaSocket.READY_EVENT, () => {
  readyForSubscriptions = true
  wss.clients.forEach((client) => {
    client.send(
      JSON.stringify({
        T: 'ready',
      }),
    )
  })
})
alpacaSocket.start()

wss.on('connection', onConnection)

function onConnection(ws: WebSocket & { isAlive?: boolean }) {
  const id = uuid()
  socketMap.set(id, ws)
  ws.isAlive = true
  ws.on('pong', () => {
    ws.isAlive = true
  })

  ws.on('message', (data: RawData) => {
    if (!data) {
      return
    }
    try {
      if (readyForSubscriptions) {
        const request = JSON.parse(data.toString()) as Request

        alpacaSocket.send(request)
      } else {
        ws.send(
          JSON.stringify({
            T: 'error',
            data: 'Not ready',
          }),
        )
      }
    } catch (e) {
      logger.error(e)
    }
  })

  ws.on('close', () => {
    socketMap.delete(id)
  })

  ws.send(
    JSON.stringify({
      type: 'id',
      data: id,
    }),
  )
}

const interval = setInterval(() => {
  wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
    if (ws.isAlive === false) {
      return ws.terminate()
    }

    ws.isAlive = false
    ws.ping()
  })
}, 30_000)

wss.on('close', function close() {
  clearInterval(interval)
})

process.on('SIGINT', close)
process.on('SIGTERM', close)

function close() {
  wss.close()
  process.exit(0)
}
