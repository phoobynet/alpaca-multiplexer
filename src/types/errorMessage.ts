import { Message } from './message'

export interface ErrorMessage extends Message {
  code: number
  msg: string
}
