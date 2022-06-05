import { Message } from './message'

export interface SubscriptionMessage extends Message {
  trades: string[]
  quotes: string[]
  bars: []
}
