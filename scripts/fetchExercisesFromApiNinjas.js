const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_KEY = "k2J3oaIkaNGSAm4Vu0G7r0uzkl6IilVJ1jAFCu9T";

const muscles = [
  "chest",
  "biceps",
  "triceps",
  "shoulders",
  "quadriceps",
  "hamstrings",
  "calves",
  "glutes",
  "abdominals",
  "lats",
  "middle_back",
  "lower_back",
  "traps",
  "forearms",
  "abductors",
  "adductors"
];

const allowedEquipment = [
  "dumbbell",
  "barbell",
  "cable",
  "machine",
  "band",
  "bodyweight"
];

async function fetchAllExercises() {
  try {
    const allExercises = [];

    for (const muscle of muscles) {
      console.log("Fetching:", muscle);

      const response = await axios.get(
        `https://api.api-ninjas.com/v1/exercises?muscle=${muscle}`,
        {
          headers: { "X-Api-Key": API_KEY }
        }
      );

      allExercises.push(...response.data);
    }

    // Remove duplicates by name
    const unique = Array.from(
      new Map(allExercises.map(e => [e.name, e])).values()
    );
console.log("Sample exercise:", allExercises[0]);
console.log(
  "All equipment types:",
  [...new Set(allExercises.flatMap(e => e.equipments || []))]
);
  const cleaned = unique
  .filter(ex => {
    const eqList = (ex.equipments || []).map(e => e.toLowerCase());

    // Keep if no equipment (bodyweight style)
    if (!ex.equipments || ex.equipments.length === 0) {
      return true;
    }

    // Keep if matches your gym equipment
    return eqList.some(eq =>
      eq.includes("dumbbell") ||
      eq.includes("barbell") ||
      eq.includes("machine") ||
      eq.includes("cable") ||
      eq.includes("band") ||
      eq.includes("bench") ||
      eq.includes("mat") ||
      eq.includes("body")
    );
  })
.map(ex => ({
  id: ex.name.toLowerCase().replace(/\s+/g, "_"),
  name: ex.name,
  category: ex.muscle,
  muscleGroups: [ex.muscle],
  equipments: ex.equipments,   // ← keep full list
  primaryEquipment: normalizeEquipment(ex.equipments),
  difficulty: ex.difficulty,
  instructions: ex.instructions,
  searchKeywords: generateKeywords(ex),
  isActive: true
}))

    const outputDir = path.join(__dirname, "../seed-data");

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
      path.join(outputDir, "api_ninjas_exercises.json"),
      JSON.stringify(cleaned, null, 2)
    );

    console.log(`\n✅ Saved ${cleaned.length} exercises`);
  } catch (err) {
    console.error("🔥 Error fetching:", err.message);
  }
}

function normalizeEquipment(equipments = []) {
  if (!equipments || equipments.length === 0) {
    return "bodyweight";
  }

  const eq = equipments.join(" ").toLowerCase();

  if (eq.includes("dumbbell")) return "dumbbell";
  if (eq.includes("barbell")) return "barbell";
  if (eq.includes("cable")) return "cable";
  if (eq.includes("machine")) return "machine";
  if (eq.includes("band")) return "band";
  if (eq.includes("bench")) return "bench";
  if (eq.includes("mat")) return "mat";
  if (eq.includes("body")) return "bodyweight";

  return "other";
}
function generateKeywords(ex) {
  return [
    ex.name.toLowerCase(),
    ex.muscle?.toLowerCase(),
    ...(ex.equipments || []).map(e => e.toLowerCase())
  ];
}

fetchAllExercises();