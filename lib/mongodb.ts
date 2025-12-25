
import { MongoClient } from 'mongodb';

// Safety check for environment variables in browser contexts
const getEnv = (key: string) => {
  try {
    return typeof process !== 'undefined' ? process.env[key] : null;
  } catch {
    return null;
  }
};

/**
 * PRODUCTION CONNECTION STRING
 * The password "wealthflow@001" contains a special character '@' which must be URL encoded as %40
 */
const uri = getEnv('MONGODB_URI') || 'mongodb+srv://wealthflow_admin:wealthflow%40001@wealthflow-cluster.e25dw6i.mongodb.net/?appName=wealthflow-cluster';
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

const isDev = getEnv('NODE_ENV') === 'development';

if (isDev) {
  let globalWithMongo = globalThis as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>;
  };

  if (!globalWithMongo._mongoClientPromise) {
    client = new MongoClient(uri, options);
    globalWithMongo._mongoClientPromise = client.connect();
  }
  clientPromise = globalWithMongo._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
