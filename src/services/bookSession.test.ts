import functions from "@react-native-firebase/functions";

export async function testBookSession(trainerId: string) {
  const callable = functions().httpsCallable("bookSession");

  try {
    const res = await callable({
      trainerId, // ✅ NOW CORRECT
      clientId: "1243498234ddfsdfsdg",
      clientGender: "female",
      clientIsHijabi: true,
      date: "2026-02-01",
      startTime: "10:00",
      endTime: "11:00",
    });

    console.log("✅ BOOKING SUCCESS:", res.data);
  } catch (e: any) {
    console.error("🔥 BOOKING ERROR:", e.code, e.message);
  }
}