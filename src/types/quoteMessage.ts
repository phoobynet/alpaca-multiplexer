import { Message } from './message'

export interface QuoteMessage extends Message {
  S: string
  // bid exchange - stock only
  bx?: string
  bp: number
  bs: number
  // ask exchange - stock only
  ax?: string
  ap: number
  as: number
  // exchange = crypto only
  x?: string
  t: string

  // conditions - stock only
  c?: string[]
  z?: string
}
