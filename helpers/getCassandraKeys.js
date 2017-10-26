// currently assumes endTime is not provided
function getPrimaryKeys(startTime, endTime) {
    const start = new Date(startTime - 0);
    return [
        {
            vdate: start.toISOString().slice(0, 10),
            vhour: start.getHours(),
        }
    ];
}

module.exports = getPrimaryKeys;
