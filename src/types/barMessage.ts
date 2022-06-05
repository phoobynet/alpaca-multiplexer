import { Message } from './message'

export interface BarMessage extends Message {
  S: string
  o: number
  h: number
  l: number
  c: number
  v: number
  t: string
}
