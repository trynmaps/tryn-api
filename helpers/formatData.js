function putVehiclesIntoRoutes(vehicles) {
    const routes = {};
    vehicles.forEach((vehicle) => {
        const vehiclesInRoute = routes[vehicle.rid] || [];
        vehiclesInRoute.push(vehicle);
        routes[vehicle.rid] = vehiclesInRoute;
    })
    return Object.keys(routes).map(routeName => ({
        name: routeName,
        vehicles: routes[routeName],
    }));
}

module.exports = putVehiclesIntoRoutes;
