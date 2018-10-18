# Trynmaps API

API for the Tryn Maps webapp

Can also be used for fetching data in notebooks for analysis or visualization.

Here's the Getting Started guide for using the API: https://github.com/trynmaps/opentransit-api-docs/wiki/Getting-Started

## Getting Started

See our welcome doc for contribution and deployment guidelines.
https://docs.google.com/document/d/1KTWRc4EO63_lDxjcp0mmprgrFPfFazWJEy2MwxBuw4E/edit?usp=sharing

1. Clone this repo.
2. Run `npm install`.
3. Ensure Orion's running.
4. Run `npm start`.

## Sample Query

Once you run it, go to http://localhost:4000/graphql and run this query:
```
query {
  trynState(agency: "muni", startTime: "1517973137052", endTime: "1517974848335", routes: ["14", "19", "49"], pointReliabilities: [{ lat: 37.77623977555669, lon: -122.41471856832504}]) {
    agency
    startTime
   pointReliabilities {
     lat
     lon
     arrivals {
       rid
       routeStates {
         vtime
        vehicles {
          vid
          lat
          lon
          heading
        }
       }
     }
   }
    routes {
      rid
      stops {
        sid
        name
        lat
        lon
      }
      routeStates {
        vtime
        vehicles {
          vid
          lat
          lon
          heading
        }
      }
    }
  }
}
```
Substitute startTime and endTime with epoch values (in milliseconds) corresponding to when Orion was actually running.

