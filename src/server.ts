import WebSocket, { RawData, WebSocketServer } from 'ws'
import { v4 as uuid } from 'uuid'
import { logger } from './logger'
import { AlpacaSocket } from './alpacaSocket'
import { Request, Message, SubscriptionMessage, Subscription } from './types'
import { getConfiguration } from './getConfiguration'
import { merge } from 'merge'
import { subscriptionDiff } from './subscriptionDiff'
import { groupMessages } from './groupMessages'

let readyForSubscriptions = false
const socketMap = new Map<string, WebSocket>()
const clientsSubscriptions = new Map<string, Subscription>()

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
  const { trades, quotes, bars } = groupMessages(messages)

  clientsSubscriptions.forEach((clientSubscription, id) => {
    const client = socketMap.get(id)

    if (!client) {
      logger.warn(`Client with id "${id}" is no longer available`)
      return
    }

    const messagesForClient: Message[] = []

    const tradesForClient = trades.filter((trade) => {
      return clientSubscription.trades?.includes(trade.S)
    })

    messagesForClient.push(...tradesForClient)

    const quotesForClient = quotes.filter((quote) => {
      return clientSubscription.quotes?.includes(quote.S)
    })

    messagesForClient.push(...quotesForClient)

    const barsForClient = bars.filter((bar) => {
      return clientSubscription.bars?.includes(bar.S)
    })

    messagesForClient.push(...barsForClient)

    client.send(JSON.stringify(messagesForClient))
  })
})
alpacaSocket.on(AlpacaSocket.ERROR_EVENT, (error: Error) => {
  logger.error(error.message)
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
        // parse the request
        const request = JSON.parse(data.toString()) as Request

        // before proceeding take a snapshot of all subscribers subscriptions
        const preUpdateSubscriptionSnapshot = merge(
          ...Array.from(clientsSubscriptions.values()),
        )
        console.log(
          'preUpdateSubscriptionSnapshot:',
          preUpdateSubscriptionSnapshot,
        )

        let clientSubscriptions = clientsSubscriptions.get(id)
        if (request.action === 'subscribe') {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { action, ...restOfObject } = request

          // merge in the updated subscription
          clientSubscriptions = merge(clientSubscriptions, restOfObject)
          clientsSubscriptions.set(id, clientSubscriptions as Subscription)
        } else if (request.action === 'unsubscribe') {
          if (clientSubscriptions) {
            const diff = subscriptionDiff(clientSubscriptions, request)
            clientSubscriptions = {
              trades: clientSubscriptions.trades?.filter(
                (x) => !diff.removed.trades?.includes(x),
              ),
              quotes: clientSubscriptions.quotes?.filter(
                (x) => !diff.removed.quotes?.includes(x),
              ),
              bars: clientSubscriptions.bars?.filter(
                (x) => !diff.removed.bars?.includes(x),
              ),
            }

            clientsSubscriptions.set(id, clientsSubscriptions as Subscription)
          }
        } else {
          logger.error('Dude, what the fuck!')
          return
        }

        const postUpdateSubscriptionSnapshot = merge(
          ...Array.from(clientsSubscriptions.values()),
        )

        console.log(
          'postUpdateSubscriptionSnapshot:',
          postUpdateSubscriptionSnapshot,
        )
        const { added, removed } = subscriptionDiff(
          preUpdateSubscriptionSnapshot,
          postUpdateSubscriptionSnapshot,
        )

        alpacaSocket.send({
          action: 'unsubscribe',
          ...removed,
        })

        alpacaSocket.send({
          action: 'subscribe',
          ...added,
        })
        ws.send(JSON.stringify(clientSubscriptions))
      } else {
        ws.send(
          JSON.stringify({
            T: 'error',
            data: 'Not ready',
          }),
        )
      }
    } catch (e) {
      console.log('Hello, something went wrong during message processing:', e)
      logger.error(e)
    }
  })

  ws.once('close', () => {
    logger.info(`Closing ${id}`)
    const preUpdateSubscriptionSnapshot = merge(
      ...Array.from(clientsSubscriptions.values()),
    )

    socketMap.delete(id)
    clientsSubscriptions.delete(id)

    const postUpdateSubscriptionSnapshot = merge(
      ...Array.from(clientsSubscriptions.values()),
    )
    const { removed } = subscriptionDiff(
      preUpdateSubscriptionSnapshot,
      postUpdateSubscriptionSnapshot,
    )

    alpacaSocket.send({
      action: 'unsubscribe',
      ...removed,
    })
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
