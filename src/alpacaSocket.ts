import EventEmitter from 'events'
import WebSocket, { ErrorEvent, RawData } from 'ws'
import { logger } from './logger'
import { Request, Message, ErrorMessage, SuccessMessage } from './types'
import { env } from './env'
import { getConfiguration } from './getConfiguration'

export class AlpacaSocket extends EventEmitter {
  private socket!: WebSocket

  public static readonly READY_EVENT = 'READY'
  public static readonly ERROR_EVENT = 'ERROR'
  public static readonly SUBSCRIPTION_EVENT = 'SUBSCRIPTION'
  public static readonly MESSAGES_EVENT = 'MESSAGES'
  public static readonly CLOSE_EVENT = 'CLOSE'
  private isReady: boolean = false

  private constructor(private url: string) {
    super()

    process.on('SIGINT', () => {
      this.stop()
    })

    process.on('SIGTERM', () => {
      this.stop()
    })
  }

  static instance(): AlpacaSocket {
    if (!_alpacaSocket) {
      _alpacaSocket = new AlpacaSocket(getConfiguration().alpacaURL)
    }

    return _alpacaSocket
  }

  send(request: Request): void {
    if (
      request.trades?.length ||
      request.quotes?.length ||
      request.bars?.length
    ) {
      logger.info('sending')
      logger.info(request)
      if (this.socket) {
        this.socket.send(JSON.stringify(request))
      } else {
        throw new Error('Attempted to send, but no socket was available')
      }
    }
  }

  start() {
    if (this.socket) {
      this.socket.close()
    }
    this.socket = new WebSocket(this.url)
    this.socket.on('close', () => {
      logger.info('Alpaca socket closed')
      this.emit(AlpacaSocket.CLOSE_EVENT)
      this.isReady = false
    })
    this.socket.on('open', () => {
      logger.info('Alpaca socket opened...will attempt to authenticate')
      this.socket.send(
        JSON.stringify({
          action: 'auth',
          key: env.APCA_API_KEY_ID,
          secret: env.APCA_API_SECRET_KEY,
        }),
      )
    })
    this.socket.on('error', (error: ErrorEvent) => {
      logger.info('Alpaca socket error: ' + error.message)
      this.emit(AlpacaSocket.ERROR_EVENT, error)
      this.isReady = false
    })
    this.socket.on('message', (data: RawData) => {
      const messages = JSON.parse(data.toString()) as Message[]

      const leading = messages[0]

      if (leading.T === 'error') {
        const errorMessage = leading as ErrorMessage
        this.emit(
          AlpacaSocket.ERROR_EVENT,
          new Error(`${errorMessage.code}: ${errorMessage.msg}`),
        )
      } else if (leading.T === 'success') {
        const successMessage = leading as SuccessMessage
        if (successMessage.msg === 'authenticated') {
          logger.info('Authenticated successfully...ready for subscriptions')
          this.emit(AlpacaSocket.READY_EVENT)
          this.isReady = true
        } else if (successMessage.msg === 'connected') {
          logger.info('Connected')
        }
      } else if (leading.T === 'subscription') {
        this.emit(AlpacaSocket.SUBSCRIPTION_EVENT, leading)
      } else {
        this.emit(AlpacaSocket.MESSAGES_EVENT, messages)
      }
    })
  }

  stop() {
    if (this.socket) {
      this.socket.close()
    }
  }
}

let _alpacaSocket: AlpacaSocket
