const { buildSchema } = require('graphql');

const schema = buildSchema(`
    type Vehicle {
        vid: Int
        lat: Float!
        lon: Float!
        heading: Int
    }

    type Route {
        name: String!
        vehicles: [Vehicle!]
    }

    type State {
        time: Int!
        routes: [Route!]
    }

    type TrynState {
        agency: String
        startTime: Int
        endTime: Int
        states: [State!]
    }

    type Query {
        trynState(
            agency: String!
            startTime: Int!
            endTime: Int
            routes: [String!]
        ): TrynState
    }

    schema {
        query: Query
    }
`);

module.exports = schema;
