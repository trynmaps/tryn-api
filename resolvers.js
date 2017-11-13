const getPrimaryKeys = require('./helpers/getCassandraKeys');
const executeQuery = require('./helpers/cassandraHelper');
const putVehiclesIntoRoutes = require('./helpers/formatData');

const resolvers = {
    trynState: async (obj) => {
        const { agency, startTime, endTime = startTime, routes } = obj;
        const { vdate, vhour } = getPrimaryKeys(startTime, endTime)[0];
        console.log(obj);

        // TODO - get these from config file using agency name
        const keyspace = agency;
        const vehicleTableName = `${agency}_realtime_vehicles`;

        const response = await executeQuery(
            `SELECT * FROM ${keyspace}.${vehicleTableName} WHERE vdate = ? AND vhour = ? AND vtime > ? AND vtime < ?`,
            [vdate, vhour, new Date(startTime - 7500), new Date(startTime - (-7500))],
        );
        const vehicles = response.rows;
        console.log(vehicles);
        // there is only one state as we assume endTime was not provided
        const stateTime = (vehicles[0] || {}).vtime;
        const stateRoutes = putVehiclesIntoRoutes(vehicles);
        return {
            agency,
            startTime,
            endTime,
            states: [
                {
                    time: stateTime,
                    routes: stateRoutes,
                }
            ]
        };
    },
}

module.exports = resolvers;
