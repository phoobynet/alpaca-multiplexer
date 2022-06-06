FROM node:18

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY ../.. .

RUN npm run build

EXPOSE 8081

CMD ["node", "dist/server.js", "--port=8081", "--alpacaURL=wss://stream.data.alpaca.markets/v2/sip"]


