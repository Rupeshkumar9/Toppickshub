import { MongoClient, ServerApiVersion, type Db } from 'mongodb';

const globalMongo = globalThis as typeof globalThis & {
  topPicksHubMongoClient?: Promise<MongoClient>;
  topPicksHubIndexes?: Promise<void>;
};

function getMongoUri() {
  const uri = import.meta.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not configured.');
  }
  return uri;
}

async function getClient() {
  if (!globalMongo.topPicksHubMongoClient) {
    const client = new MongoClient(getMongoUri(), {
      maxPoolSize: 10,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 5_000,
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
    });

    globalMongo.topPicksHubMongoClient = client.connect().catch((error) => {
      globalMongo.topPicksHubMongoClient = undefined;
      throw error;
    });
  }

  return globalMongo.topPicksHubMongoClient;
}

export async function getDatabase(): Promise<Db> {
  const client = await getClient();
  const databaseName = import.meta.env.MONGODB_DB_NAME || 'toppickshub';
  const database = client.db(databaseName);

  if (!globalMongo.topPicksHubIndexes) {
    globalMongo.topPicksHubIndexes = Promise.all([
      database.collection('comments').createIndex(
        { pageId: 1, status: 1, parentId: 1, createdAt: -1, _id: -1 },
        { name: 'comments_page_status_parent_created' },
      ),
      database.collection('comments').createIndex(
        { parentId: 1, status: 1, createdAt: 1 },
        { name: 'comments_replies' },
      ),
    ]).then(() => undefined).catch((error) => {
      globalMongo.topPicksHubIndexes = undefined;
      throw error;
    });
  }

  await globalMongo.topPicksHubIndexes;
  return database;
}
