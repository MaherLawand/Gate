const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountsKey.json");
const { last, update } = require("lodash");

// 🔐 Initialize Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * ✏️ EDIT THIS ARRAY ONLY
 */
const trainerInvites = [
  {
    role: "trainer",
    // Identity
    firstName: "Joelle",
    lastName: "Sakr",
    phone: "+96170300981",
    profilePicture: "", // optional
    bio: "",

    // Account settings
    notificationsEnabled: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: null,
    updatedAt: null,
    // Status
    isActive: true,
  },
  {
    role: "trainer",
    // Identity
    firstName: "Nicole",
    lastName: "beainy",
    phone: "+96170300982",
    profilePicture: "", // optional
    bio: "",

    // Account settings
    notificationsEnabled: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    lastLoginAt: null,
    updatedAt: null,
    // Status
    isActive: true,
  },
  //   {
  //     firstName: "John",
  //     lastName: "Doe",
  //     phone: "+96170123456",
  //   },
];

async function run() {
  console.log("🚀 Creating trainer invites...\n");

  for (const trainer of trainerInvites) {
    const phone = trainer.phone;

    if (!phone.startsWith("+")) {
      console.error(`❌ Invalid phone format: ${phone}`);
      continue;
    }

    const ref = db.collection("trainer_invites").doc(phone)

    await ref.set({
      role: "trainer",

      // Identity
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      phone: trainer.phone,
      profilePicture: trainer.profilePicture || null,
      bio: trainer.bio || "",

      // Settings
      notificationsEnabled: trainer.notificationsEnabled ?? true,

      // Status
      isActive: trainer.isActive ?? true,

      // System
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: null,
      lastLoginAt: null,
    });

    console.log(
      `✅ Invite created for ${trainer.firstName} ${trainer.lastName} (${phone})`
    );
  }

  console.log("\n🎉 Done.");
  process.exit(0);
}

run().catch((err) => {
  console.error("🔥 Error creating invites:", err);
  process.exit(1);
});
