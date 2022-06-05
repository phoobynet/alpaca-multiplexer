import { Message } from './message'

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
  // conditions - stock only
  c: string[]
  // tape - stock only
  z: string

  // crypto only
  tks?: 'B' | 'S'
}
