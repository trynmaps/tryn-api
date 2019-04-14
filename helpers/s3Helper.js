const _ = require('lodash');
const AWS = require('aws-sdk');
var zlib = require('zlib');

const s3 = new AWS.S3();

const s3Bucket = process.env.TRYNAPI_S3_BUCKET || "orion-vehicles";
console.log(`Reading state from s3://${s3Bucket}`);

/*
 * Gets bucket prefix at the minute-level
 * @param agency - String
 * @param currentTime - Number
 * @return prefix - String
 */
function getBucketMinutePrefix(agency, currentTime) {
  const currentDateTime = new Date(Number(currentTime));
  const year = currentDateTime.getUTCFullYear();
  const month = currentDateTime.getUTCMonth()+1;
  const day = currentDateTime.getUTCDate();
  const hour = currentDateTime.getUTCHours();
  const minute = currentDateTime.getUTCMinutes();
  return `${agency}/${year}/${month}/${day}/${hour}/${minute}/`;
}

function getS3Paths(prefix) {
  return new Promise((resolve, reject) => {
    s3.listObjects({
      Bucket: s3Bucket,
      Prefix: prefix,
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Contents.map(obj => obj.Key));
      }
    });
  });
}

/*
 * @param startEpoch - Number
 * @param endEpoch - Number
 * @return s3Files - [String]
 */
async function getOrionVehicleFiles (agency, startEpoch, endEpoch) {
  if (!endEpoch) {
    endEpoch = startEpoch;
  }
  // Idea: there are 1440 minutes in a day, and the API return at most 1-2 days,
  // so we can iterate every minute (as we have to get each file individually anyways)
  minutePrefixes = []
  for (let time = startEpoch; time <= endEpoch; time += 60000) {
    minutePrefixes.push(getBucketMinutePrefix(agency, time));
  }
  return _.flatten(await Promise.all(minutePrefixes.map(prefix => getS3Paths(prefix))));
}

// unzip the gzip dats
function decompressData(data) {
  return new Promise((resolve, _) => {
    return zlib.unzip(data, (_, decoded) => resolve(JSON.parse(decoded.toString())));
  });
}

/*
 * Downloads and unzips the S3 files
 */
async function getS3Vehicles(keys) {
  return _.flatten(await Promise.all(keys.map(key => {
      return new Promise((resolve, reject) => {
        s3.getObject({
          Bucket: s3Bucket,
          Key: key,
        }, (err, data) => {
          if (err) {
              reject(err);
          } else {
              decompressData(data.Body)
                .then(decodedData =>
                  resolve(insertVtime(key, decodedData)));
          }
        });
      });
  })));
}

/*
 * The API defines vtime (epoch time in ms) as a field for each vehicle,
 * which was also a column in Cassandra.
 * Since the vtime is in the key in S3, that field does not exist,
 * thus we have to add it in the S3Helper as maintain compatibility
 */
function insertVtime(key, vehicles) {
  // time epoch is in the last part of the key
  // .../agency_time (in ms)
  return vehicles.map(vehicle => ({
    ...vehicle,
    vtime: key.split('-')[1].split('.json')[0],
    // TODO - not very robust if naming convention changes
    // or if dashes in agency name
  }));
}

module.exports = {
  getOrionVehicleFiles,
  getS3Vehicles,
};

