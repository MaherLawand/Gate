const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountsKey.json");
const exercises = require("../seed-data/api_ninjas_exercises_no_instructions.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/* ================= HELPER ================= */

function generateSearchKeywords(ex) {
  const keywords = new Set();

  if (ex.name) keywords.add(ex.name.toLowerCase());

  if (ex.category) keywords.add(ex.category.toLowerCase());

  if (ex.muscleGroups && Array.isArray(ex.muscleGroups)) {
    ex.muscleGroups.forEach(m =>
      keywords.add(m.toLowerCase())
    );
  }

  if (ex.equipment) {
    keywords.add(ex.equipment.toLowerCase());
  }

  if (ex.difficulty) {
    keywords.add(ex.difficulty.toLowerCase());
  }

  return Array.from(keywords);
}

/* ================= RUN SCRIPT ================= */

async function run() {
  console.log("🚀 Importing exercises...\n");

  const batchSize = 400;
  let batch = db.batch();
  let count = 0;

  for (const ex of exercises) {
    const safeId = ex.id
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "_")   // remove everything not letter/number
  .replace(/_+/g, "_")         // collapse multiple underscores
  .replace(/^_|_$/g, "");      // trim edges

const ref = db.collection("Exercises").doc(safeId);

    batch.set(ref, {
      id: ex.id,
      name: ex.name,
      category: ex.category || "general",
      muscleGroups: ex.muscleGroups || [],
      equipment: ex.equipment || "bodyweight",
      difficulty: ex.difficulty || "beginner",
      searchKeywords: generateSearchKeywords(ex),
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    count++;

    if (count % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`✅ Imported ${count}`);
    }
  }

  await batch.commit();

  console.log(`🎉 Successfully imported ${count} exercises.`);
  process.exit(0);
}

run().catch((err) => {
  console.error("🔥 Error importing exercises:", err);
  process.exit(1);
});