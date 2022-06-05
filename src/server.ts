import { logger } from './logger'
import { AlpacaSocket } from './alpacaSocket'
import { Message, SubscriptionMessage, Subscription } from './types'
import { ServerSocket } from './serverSocket'

const alpacaSocket = AlpacaSocket.instance()

const serverSocket = new ServerSocket()
serverSocket.on(ServerSocket.CLOSED_EVENT, () => {})
serverSocket.on(ServerSocket.REMOVED_EVENT, (removed: Subscription) => {
  alpacaSocket.send({
    action: 'unsubscribe',
    ...removed,
  })
})
serverSocket.on(ServerSocket.ADDED_EVENT, (added: Subscription) => {
  alpacaSocket.send({
    action: 'subscribe',
    ...added,
  })
})

alpacaSocket.on(
  AlpacaSocket.SUBSCRIPTION_EVENT,
  (subscription: SubscriptionMessage) => {
    logger.info(subscription)
  },
)
alpacaSocket.on(AlpacaSocket.MESSAGES_EVENT, (messages: Message[]) => {
  serverSocket.distribute(messages)
})
alpacaSocket.on(AlpacaSocket.ERROR_EVENT, (error: Error) => {
  logger.error(error.message)
})

alpacaSocket.start()
