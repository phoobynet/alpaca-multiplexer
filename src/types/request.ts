export interface Request {
  action: 'subscribe' | 'unsubscribe'
  trades?: string[]
  quotes?: string[]
  bars?: string[]
}
