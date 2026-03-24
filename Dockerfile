# Nakama game server (same image as local docker-compose). Render runs this Dockerfile only—no docker-compose.
FROM heroiclabs/nakama:3.15.0

COPY nakama/ /nakama/data/
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

ENTRYPOINT ["/usr/bin/tini", "--", "/docker-entrypoint.sh"]
