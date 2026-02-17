const admin = require("firebase-admin");

const oldService = require("./gate-2056a-firebase-adminsdk-fbsvc-c4363e7eed.json");
const newService = require("./gateprivategym-951cf-firebase-adminsdk-fbsvc-431bcd7f18.json");

const oldApp = admin.initializeApp(
  { credential: admin.credential.cert(oldService) },
  "old"
);

const newApp = admin.initializeApp(
  { credential: admin.credential.cert(newService) },
  "new"
);

const oldDb = oldApp.firestore();
const newDb = newApp.firestore();

async function copyCollection(collectionPath) {
  const snapshot = await oldDb.collection(collectionPath).get();

  for (const doc of snapshot.docs) {
    await newDb.collection(collectionPath).doc(doc.id).set(doc.data());
    console.log(`Copied ${collectionPath}/${doc.id}`);
  }
}

async function migrate() {
  const collections = await oldDb.listCollections();

  for (const collection of collections) {
    console.log(`Copying collection: ${collection.id}`);
    await copyCollection(collection.id);
  }

  console.log("Migration complete.");
}

migrate();