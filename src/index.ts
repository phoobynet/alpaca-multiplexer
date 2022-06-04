import express from 'express'
import morgan from 'morgan'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
app.use(helmet())
app.use(cors())
app.use(express.json())
app.use(morgan('common'))

const httpServer = createServer(app)
const io = new Server(httpServer, {
  /* options */
})

io.on('connection', (socket) => {
  socket.send('Greetings user')
})

const PORT = process.env.ALPACA_MULTIPLEXER_PORT || 3001

httpServer.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`)
})
