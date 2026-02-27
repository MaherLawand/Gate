const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountsKey.json");
require("dotenv").config();

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
    firstName: "First",
    lastName: "Trainer",
    phone: "+96170300982",
    profilePicture: "",
    bio: "",
    notificationsEnabled: true,
    isActive: true,
    isAdmin: false,
  },
  {
    role: "trainer",
    firstName: "Second",
    lastName: "Trainer",
    phone: "+96170300983",
    profilePicture: "",
    bio: "",
    notificationsEnabled: true,
    isActive: true,
    isAdmin:false,
  },
    {
    role: "trainer",
    firstName: "Third",
    lastName: "Trainer",
    phone: "+96170300984",
    profilePicture: "",
    bio: "",
    notificationsEnabled: true,
    isActive: true,
    isAdmin:false,
  },
      {
    role: "trainer",
    firstName: "Fourth",
    lastName: "Trainer",
    phone: "+96170300981",
    profilePicture: "",
    bio: "",
    notificationsEnabled: true,
    isActive: true,
    isAdmin:false,
  },
];

async function run() {
  console.log("🚀 Creating trainer invites...\n");

  for (const trainer of trainerInvites) {
    const phone = trainer.phone;

    if (!phone.startsWith("+")) {
      console.error(`❌ Invalid phone format: ${phone}`);
      continue;
    }

    const ref = db.collection("trainer_invites").doc(phone);

    await ref.set({
      role: "trainer",
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      phone,
      profilePicture: trainer.profilePicture || null,
      bio: trainer.bio || "",
      notificationsEnabled: trainer.notificationsEnabled ?? true,
      isActive: trainer.isActive ?? true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: null,
      lastLoginAt: null,
      isAdmin: trainer.isAdmin ?? false,
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