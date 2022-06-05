import EventEmitter from 'events'
import WebSocket, { ErrorEvent, MessageEvent, RawData } from 'ws'
import { logger } from './logger'
import { Env } from './env'
import { Request } from './request'

export interface Message {
  T: 'q' | 't' | 'b' | 'error' | 'subscription' | 'success'
}

export interface ErrorMessage extends Message {
  code: number
  msg: string
}

export interface SuccessMessage extends Message {
  msg: string
}

export interface SubscriptionMessage extends Message {
  trades: string[]
  quotes: string[]
  bars: []
}

export interface TradeMessage extends Message {
  i: number
  // symbol
  S: string
  // exchange
  x: string
  // price
  p: number
  // size
  s: number
  // timestamp
  t: string
  // conditions
  c: string[]
  // tape
  z: string
}

export interface QuoteMessage extends Message {
  S: string
  bx: string
  bp: number
  bs: number
  ax: string
  ap: number
  as: number
  t: string
  c: string[]
  z: string
}

export interface BarMessage extends Message {
  S: string
  o: number
  h: number
  l: number
  c: number
  v: number
  t: string
}

export class AlpacaSocket extends EventEmitter {
  private socket!: WebSocket

  public static readonly READY_EVENT = 'READY'
  public static readonly ERROR_EVENT = 'ERROR'
  public static readonly SUBSCRIPTION_EVENT = 'SUBSCRIPTION'
  public static readonly MESSAGES_EVENT = 'MESSAGES'
  public static readonly CLOSE_EVENT = 'CLOSE'
  private isReady: boolean = false

  constructor(private url: string, private env: Env) {
    super()
  }

  send(request: Request): void {
    if (this.socket) {
      this.socket.send(JSON.stringify(request))
    } else {
      throw new Error('Attempted to send, but no socket was available')
    }
  }

  start() {
    this.socket = new WebSocket(this.url)
    this.socket.on('close', () => {
      this.isReady = false
      this.emit(AlpacaSocket.CLOSE_EVENT)
    })
    this.socket.on('open', () => {
      this.socket.send(
        JSON.stringify({
          action: 'auth',
          key: this.env.APCA_API_KEY_ID,
          secret: this.env.APCA_API_SECRET_KEY,
        }),
      )
    })
    this.socket.on('error', (error: ErrorEvent) => {
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
