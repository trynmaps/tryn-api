const getStopsFromRouteID = require('./helpers/getStops');
const config = require('./config');
const makePointReliabilities = require('./helpers/makePointReliabilities');
const s3Helper = require('./helpers/s3Helper.js');
const _ = require('lodash');

const isRawRestbusData = process.env.TRYNAPI_S3_BUCKET == 'orion-raw';

if (isRawRestbusData) {
    console.log("S3 objects interpreted as raw Restbus data");
}

const resolvers = {
    Query: {
        trynState: async (obj, params) => {
            const { agency, routes } = params;

            let { startTime, endTime, pointReliabilities } = params;

            // times are returned as strings because GraphQL numbers are only 32-bit
            // https://github.com/graphql/graphql-js/issues/292
            startTime = Number(startTime);
            endTime = Number(endTime);

            const s3Keys = await s3Helper.getOrionVehicleFiles(agency, startTime, endTime);
            const vehicles = await s3Helper.getS3Vehicles(s3Keys);

            // group the vehicles by route, and then by time
            const vehiclesByRouteByTime = vehicles.reduce((acc, vehicle) => {
                const routeId = isRawRestbusData ? vehicle.routeId : vehicle.rid;
                const vtime = vehicle.vtime;
                acc[routeId] = acc[routeId] || [];
                acc[routeId][vtime] = acc[routeId][vtime] || [];
                acc[routeId][vtime].push(vehicle);
                return acc;
            }, {});

            // get all the routes
            const routeIDs = routes ?
                _.intersection(routes, Object.keys(vehiclesByRouteByTime)) :
                Object.keys(vehiclesByRouteByTime);

            return {
                agency,
                routeIDs,
                startTime,
                endTime,
                pointReliabilities,
                vehiclesByRouteByTime
            };
        },
    },

    TrynState: {
        agency: obj => obj.agency,
        startTime: obj => obj.startTime,
        endTime: obj => obj.endTime,
        routes: obj => {
            return obj.routeIDs.map((rid) => {
                return {id: rid, agency: obj.agency, vehiclesByTime: obj.vehiclesByRouteByTime[rid]};
            });
        },
        pointReliabilities: obj => {
            return (obj.pointReliabilities || [])
                .map(point => makePointReliabilities(point, obj.vehiclesByRouteByTime, obj.routeIDs));
        }
    },

    Route: {
        rid: route => route.id,
        routeStates: route => {
            const vehiclesByTime = route.vehiclesByTime || {};
            return Object.keys(vehiclesByTime).map((vtime) => ({
                vtime,
                vehicles: vehiclesByTime[vtime],
            }));
        },
        stops: route => {
            if (route.agency === "muni" || route.agency === "ttc") {
                return getStopsFromRouteID(route.id, route.agency === "muni" ? "sf-muni" : route.agency);
            } else {
                return [];
            }
        }
    },

    Vehicle: {
        vid: vehicle => (isRawRestbusData ? vehicle.id : vehicle.vid),
        did: vehicle => (isRawRestbusData ? vehicle.directionId : vehicle.did),
        lat: vehicle => vehicle.lat,
        lon: vehicle => vehicle.lon,
        heading: vehicle => vehicle.heading,
        secsSinceReport: vehicle => vehicle.secsSinceReport,
    }
};

module.exports = resolvers;
