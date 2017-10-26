const { buildSchema } = require('graphql');

const schema = buildSchema(`
    type Vehicle {
        vid: String
        lat: Float
        lon: Float
        heading: Int
    }

    type Route {
        name: String
        vehicles: [Vehicle]
    }

    type State {
        time: String
        routes: [Route]
    }

    type TrynState {
        agency: String
        startTime: String
        endTime: String
        states: [State]
    }

    type Query {
        trynState(
            agency: String!
            startTime: String!
            endTime: String
            routes: [String!]
        ): TrynState
    }

    schema {
        query: Query
    }
`);

module.exports = schema;
