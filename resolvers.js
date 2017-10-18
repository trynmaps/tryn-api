const getPrimaryKeys = require('./helpers/getCassandraKeys');
const executeQuery = require('./helpers/cassandraHelper');
const putVehiclesIntoRoutes = require('./helpers/formatData');

const resolvers = {
    trynState: async (obj) => {
        const { agency, startTime, endTime = startTime, routes } = obj;
        const { vdate, vhour } = getPrimaryKeys(startTime, endTime)
        const vehicles = await executeQuery(
            'SELECT * FROM muni.muni_realtime_vehicles WHERE vdate = ? AND vhour = ? AND vtime > ? AND vtime < ?',
            [vdate, vhour, startTime - 15000, startTime + 15000],
        );
        const stateTime = vehicles[0].vtime;
        // there is only one state as we assume endTime was not provided
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
