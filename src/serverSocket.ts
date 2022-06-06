import WebSocket, { RawData, WebSocketServer } from 'ws'
import { getConfiguration } from './getConfiguration'
import EventEmitter from 'events'
import { v4 as uuid } from 'uuid'
import { Message, Request, Subscription } from './types'
import { merge } from 'merge'
import { subscriptionDiff } from './subscriptionDiff'
import { logger } from './logger'
import { groupMessages } from './groupMessages'

export class ServerSocket extends EventEmitter {
  private wss: WebSocketServer
  private clientSockets = new Map<string, WebSocket>()
  private clientSubscriptions = new Map<string, Subscription>()
  private readonly interval: ReturnType<typeof setInterval>

  public static CLOSED_EVENT = 'closed'
  public static REMOVED_EVENT = 'removed'
  public static ADDED_EVENT = 'added'

  constructor() {
    super()
    this.wss = new WebSocketServer({
      port: getConfiguration().port,
    })
    this.wss.on('connection', this.onConnection.bind(this))
    this.wss.on('close', this.onClose.bind(this))
    this.interval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket & { isAlive?: boolean }) => {
        if (ws.isAlive === false) {
          return ws.terminate()
        }

        ws.isAlive = false
        ws.ping()
      })
    }, 30_000)

    process.on('SIGINT', this.close.bind(this))
    process.on('SIGTERM', this.close.bind(this))
  }

  public distribute(messages: Message[]) {
    const { trades, quotes, bars } = groupMessages(messages)

    this.clientSubscriptions.forEach((clientSubscription, id) => {
      const client = this.clientSockets.get(id)

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
  }

  private onConnection(ws: WebSocket & { isAlive?: boolean }) {
    const id = uuid()
    this.clientSockets.set(id, ws)
    ws.isAlive = true
    ws.on('pong', () => {
      ws.isAlive = true
    })

    ws.on('message', (data: RawData) => {
      if (!data) {
        return
      }
      try {
        // parse the request
        const request = JSON.parse(data.toString()) as Request

        // before proceeding take a snapshot of all subscribers subscriptions
        const preUpdateSubscriptionSnapshot = merge(
          ...Array.from(this.clientSubscriptions.values()),
        )

        let clientSubscription = this.clientSubscriptions.get(id)
        if (request.action === 'subscribe') {
          const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            action,
            ...restOfObject
          } = request

          // merge in the updated subscription
          clientSubscription = merge(clientSubscription, restOfObject)
          this.clientSubscriptions.set(id, clientSubscription as Subscription)
        } else if (request.action === 'unsubscribe') {
          if (clientSubscription) {
            const diff = subscriptionDiff(clientSubscription, request)
            clientSubscription = {
              trades: clientSubscription.trades?.filter(
                (x) => !diff.removed.trades?.includes(x),
              ),
              quotes: clientSubscription.quotes?.filter(
                (x) => !diff.removed.quotes?.includes(x),
              ),
              bars: clientSubscription.bars?.filter(
                (x) => !diff.removed.bars?.includes(x),
              ),
            }

            this.clientSubscriptions.set(id, clientSubscription as Subscription)
          }
        } else {
          logger.error('User tried to use unrecognised action')
          ws.send(
            JSON.stringify({
              T: 'error',
              msg: 'Unrecognised action',
            }),
          )
          return
        }

        const postUpdateSubscriptionSnapshot = merge(
          ...Array.from(this.clientSubscriptions.values()),
        )

        const { added, removed } = subscriptionDiff(
          preUpdateSubscriptionSnapshot,
          postUpdateSubscriptionSnapshot,
        )

        this.emit(ServerSocket.REMOVED_EVENT, removed)
        this.emit(ServerSocket.ADDED_EVENT, added)
        ws.send(JSON.stringify(clientSubscription))
      } catch (e) {
        logger.error(e)
      }
    })

    ws.once('close', () => {
      logger.info(`Closing ${id}`)
      const preUpdateSubscriptionSnapshot = merge(
        ...Array.from(this.clientSubscriptions.values()),
      )

      this.clientSockets.delete(id)
      this.clientSubscriptions.delete(id)

      const postUpdateSubscriptionSnapshot = merge(
        ...Array.from(this.clientSubscriptions.values()),
      )
      const { removed } = subscriptionDiff(
        preUpdateSubscriptionSnapshot,
        postUpdateSubscriptionSnapshot,
      )

      this.emit(ServerSocket.REMOVED_EVENT, removed)
      this.emit(ServerSocket.CLOSED_EVENT)
    })

    ws.send(
      JSON.stringify({
        type: 'id',
        data: id,
      }),
    )
  }

  private onClose() {
    clearInterval(this.interval)
    this.emit(ServerSocket.CLOSED_EVENT)
  }

  private close() {
    this.wss.close()
  }
}
