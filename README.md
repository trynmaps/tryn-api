# Trynmaps API

API for the Tryn Maps webapp

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
  trynState(agency: "muni", startTime: "1516159925994", endTime: "1516171245800") {
    agency
    startTime
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

