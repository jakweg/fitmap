# FitMap

#### Simple web app that combines workouts from multiple apps to show all on the same map.

All processing and storing is done locally in a browser, no location data is sent anywhere.

![Example map](example-map.avif)

#### Supported location providers:

- **FitBit** via oauth login
- **Google FIT** via zip exported using [google takeout](https://takeout.google.com)
- **Endomondo** via backup zip

##### Build and run from source

Please start with getting your own API keys for the map and FitBit api - see `example.env` and then run `npm run dev`
