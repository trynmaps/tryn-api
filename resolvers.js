const getPrimaryKeys = require('./helpers/getPrimaryKeys');
const executeQuery = require('./helpers/cassandraHelper');
const getStopsFromRouteID = require('./helpers/getStops');
const config = require('./config');

const _ = require('lodash');
const axios = require('axios');

const resolvers = {
    trynState: async (obj) => {
        const { agency, routes } = obj;

        let { startTime, endTime } = obj;
        // times are returned as strings because GraphQL numbers are only 32-bit
        // https://github.com/graphql/graphql-js/issues/292
        startTime = Number(startTime);
        endTime = Number(endTime);

        const primaryKeys = getPrimaryKeys(startTime, endTime);

        // TODO - get these from config file using agency name
        const keyspace = agency;
        const vehicleTableName = `${agency}_realtime_vehicles`;

        const responses = await Promise.all(primaryKeys.map(({vdate, vhour}) =>
            executeQuery(
            `SELECT * FROM ${keyspace}.${vehicleTableName} WHERE vdate = ? AND vhour = ? AND vtime > ? AND vtime < ?`,
            [vdate, vhour, new Date(startTime), new Date(endTime)],
        )));

        // vehicles are clustered by primary key - so put them into the same list
        const vehicles = _.flatten(responses.map(({rows}) => rows));

        // group the vehicles by route, and then by time
        const vehiclesByRouteByTime = vehicles.reduce((acc, vehicle) => {
            acc[vehicle.rid] = acc[vehicle.rid] || [];
            acc[vehicle.rid][vehicle.vtime] = acc[vehicle.rid][vehicle.vtime] || [];

            acc[vehicle.rid][vehicle.vtime].push(vehicle);
            return acc;
        }, {});

        // get all the routes
        const routeIDs = Object.keys(vehiclesByRouteByTime);
        
        // get all the stops
        let stopsByRoute = {};
        // TODO - https://github.com/trynmaps/tryn-api/issues/13 
        if (agency === "muni") {
            stopsByRoute = routeIDs.reduce((acc, rid) => {
                acc[rid] = getStopsFromRouteID(rid);
                return acc;
            }, {});
        }       

        return {
            agency,
            startTime,
            endTime,
            routes: routeIDs.map(rid => ({
                rid,
                stops: stopsByRoute[rid],
                routeStates: Object.keys(vehiclesByRouteByTime[rid]).map((vtime) => ({
                    vtime,
                    vehicles: vehiclesByRouteByTime[rid][vtime],
                })),
            })),
        };
    },
}

module.exports = resolvers;
