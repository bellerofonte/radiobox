#!/bin/sh
curl -s -X POST -d "event=$PLAYER_EVENT" "http://127.0.0.1:80/spotify_event"