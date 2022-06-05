import winston from 'winston'

const logFormat = winston.format.printf(function (info) {
  return `${info.level}: ${JSON.stringify(info.message, null, 2)}`
})

export const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      level: 'info',
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
  ],
})
