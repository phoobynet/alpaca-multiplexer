import { cleanEnv, str } from 'envalid'

export interface Env {
  APCA_API_KEY_ID: string
  APCA_API_SECRET_KEY: string
}

export const env = cleanEnv<Env>(process.env, {
  APCA_API_KEY_ID: str(),
  APCA_API_SECRET_KEY: str(),
})
