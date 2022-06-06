# Alpaca Multiplexer

## Docker

```bash
docker build -t alpaca-multiplexer:1.0.0 .
```

```bash
docker run -d -it -p 8080:8080 -e=APCA_API_KEY_ID=<key> -e=APCA_API_SECRET_KEY=<secret> alpaca-multiplexer:1.0.0
```
