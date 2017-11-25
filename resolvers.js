const getPrimaryKeys = require('./helpers/getCassandraKeys');
const executeQuery = require('./helpers/cassandraHelper');
const getRouteObj = require('./helpers/formatData');

const axios = require('axios');
const config = require('./config');

function getStopsFromRouteID(routeID) {
    return axios.get(`/agencies/sf-muni/routes/${routeID}`, {
      baseURL: config.restbusURL
    })
    .then((response) => {
      const stopsObj = response.data;
      return stopsObj;
    })
    .catch((error) => {
      console.log(error);
    });
}

const resolvers = {
    trynState: async (obj) => {
        const { agency, startTime, endTime = startTime, routes } = obj;
        const { vdate, vhour } = getPrimaryKeys(startTime, endTime)[0];
        // console.log(obj);

        // TODO - get these from config file using agency name
        const keyspace = agency;
        const vehicleTableName = `${agency}_realtime_vehicles`;

        const response = await executeQuery(
            `SELECT * FROM ${keyspace}.${vehicleTableName} WHERE vdate = ? AND vhour = ? AND vtime > ? AND vtime < ?`,
            [vdate, vhour, new Date(startTime - 7500), new Date(startTime - (-7500))],
        );

        const vehicles = response.rows;

        // there is only one state as we assume endTime was not provided
        const stateTime = (vehicles[0] || {}).vtime;

        var routeIDs = new Set();
        vehicles.forEach((vehicle) => {
            routeIDs.add(vehicle.rid);
        });

        var stopsPromises = [];
        routeIDs.forEach((routeID) => stopsPromises.push(getStopsFromRouteID(routeID)));
        var stops = await (Promise.all(stopsPromises).then((stopsForOneRoute) => {
            return stopsForOneRoute;
        }).catch((error)=>{
            console.log(error);
        }));
        const stateRoutes = getRouteObj(routeIDs, vehicles, stops);

        return {
            agency,
            startTime,
            endTime,
            states: [
                {
                    time: stateTime,
                    routes: stateRoutes
                }
            ]
        }
    },
}

module.exports = resolvers;
