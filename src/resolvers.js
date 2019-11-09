const s3Helper = require('./helpers/s3Helper.js');
const removeMuniMetroDuplicates = require('./helpers/removeMuniMetroDuplicates');
const BigInt = require('./bigint');

const _ = require('lodash');

const debug = !!process.env.DEBUG;

const resolvers = {

    // use BigInt to represent Unix timestamps because GraphQL Int type is only 32-bit
    // and would overflow in January 2038 https://github.com/graphql/graphql-js/issues/292
    BigInt: BigInt,

    Query: {
        state: async (obj, params) => {
            const { agencyId, routes } = params;

            let { startTime, endTime } = params;

            const vehicles = await s3Helper.getVehicles(agencyId, startTime, endTime);

            // group the vehicles by route, and then by time
            const vehiclesByRouteByTime = vehicles.reduce((acc, vehicle) => {
                const routeId = vehicle.rid;
                const vtime = vehicle.timestamp;
                acc[routeId] = acc[routeId] || [];
                acc[routeId][vtime] = acc[routeId][vtime] || [];
                acc[routeId][vtime].push(vehicle);
                return acc;
            }, {});

            // remove duplicate Muni Metro vehicles
            if (agencyId === 'muni') {
                const affectedRouteIDs = ['KT', 'L', 'M', 'N', 'J'];
                affectedRouteIDs.forEach(routeID => {
                    if (debug) {
                        console.log(routeID);
                    }
                    if (vehiclesByRouteByTime[routeID]) {
                        vehiclesByRouteByTime[routeID] = removeMuniMetroDuplicates(
                            vehiclesByRouteByTime[routeID],
                        );
                    }
                });
            }

            // get all the routes
            const routeIDs = routes ?
                _.intersection(routes, Object.keys(vehiclesByRouteByTime)) :
                Object.keys(vehiclesByRouteByTime);

            return {
                agencyId,
                routeIDs,
                startTime,
                endTime,
                vehiclesByRouteByTime
            };
        },
    },

    AgencyState: {
        agencyId: obj => obj.agencyId,
        startTime: obj => obj.startTime,
        endTime: obj => obj.endTime,
        routes: obj => {
            return obj.routeIDs.map((rid) => {
                return {id: rid, agencyId: obj.agencyId, vehiclesByTime: obj.vehiclesByRouteByTime[rid]};
            });
        }
    },

    RouteHistory: {
        routeId: route => route.id,
        states: route => {
            const vehiclesByTime = route.vehiclesByTime || {};
            return Object.keys(vehiclesByTime).map((timestamp) => ({
                timestamp: timestamp,
                vehicles: vehiclesByTime[timestamp],
            }));
        }
    },

    VehicleState: {
        vid: vehicle => vehicle.vid,
        did: vehicle => vehicle.did,
        lat: vehicle => vehicle.lat,
        lon: vehicle => vehicle.lon,
        heading: vehicle => vehicle.heading,
        secsSinceReport: vehicle => vehicle.secsSinceReport,
        numCars: vehicle => vehicle.numCars,
        tripId: vehicle => vehicle.tripId,
        stopIndex: vehicle => vehicle.stopIndex,
        status: vehicle => vehicle.status,
    }
};

module.exports = resolvers;
