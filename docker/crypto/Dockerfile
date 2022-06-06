FROM node:18

WORKDIR /usr/app

COPY package*.json ./

RUN npm install

COPY ../.. .

RUN npm run build

EXPOSE 8080

CMD ["node", "dist/server.js", "--port=8080", "--alpacaURL=wss://stream.data.alpaca.markets/v1beta1/crypto"]


