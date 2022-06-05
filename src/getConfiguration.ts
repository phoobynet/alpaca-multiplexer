import { Configuration } from './types'
import { parse } from 'ts-command-line-args'

const config = parse<Configuration>({
  port: Number,
  alpacaURL: String,
})

export const getConfiguration = (): Configuration => {
  return config
}
