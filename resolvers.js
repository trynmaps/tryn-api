const getPrimaryKeys = require('./helpers/getPrimaryKeys');
const executeQuery = require('./helpers/cassandraHelper');
const getStateRoutes = require('./helpers/formatStateData');
const getStopsFromRouteID = require('./helpers/getStops');
const config = require('./config');

const _ = require('lodash');
const axios = require('axios');

const resolvers = {
    trynState: async (obj) => {
        const { agency, routes } = obj;

        let { startTime, endTime } = obj;
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

        // cluster vehicles by their individual timestamp
        const vehiclesByTime = vehicles.reduce((acc, vehicle) => {
            acc[vehicle.vtime] = (acc[vehicle.vtime] || []).concat(vehicle);
            return acc;
        }, {});

        const stateTimes = Object.keys(vehiclesByTime).sort();

        const states = await Promise.all(
            stateTimes.map(async stateTime => {
                const stateVehicles = vehiclesByTime[stateTime];
                const routeIDs = _.uniq(stateVehicles.map(vehicle => vehicle.rid));
                const stops = await Promise.all(routeIDs.map(getStopsFromRouteID));
                return {
                    time: stateTime,
                    routes: getStateRoutes(routeIDs, stateVehicles, stops),
                };
            })
        );

        return {
            agency,
            startTime,
            endTime,
            states,
        };
    },
}

module.exports = resolvers;
