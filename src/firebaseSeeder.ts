import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { SEED_ENTITIES, SEED_REPORTS } from "./mockData";

export async function seedDatabaseIfNeeded() {
  try {
    // Check if entities collection is empty
    const entitiesCol = collection(db, "entities");
    const entitySnap = await getDocs(entitiesCol);
    
    if (entitySnap.empty) {
      console.log("Seeding Firestore entities...");
      for (const entity of SEED_ENTITIES) {
        await setDoc(doc(db, "entities", entity.id), entity);
      }
      console.log("Seeding entities completed!");
    } else {
      console.log("Entities collection already has data. Skipping seed.");
    }

    // Check if reports collection is empty
    const reportsCol = collection(db, "reports");
    const reportSnap = await getDocs(reportsCol);
    
    if (reportSnap.empty) {
      console.log("Seeding Firestore reports...");
      for (const report of SEED_REPORTS) {
        await setDoc(doc(db, "reports", report.id), report);
      }
      console.log("Seeding reports completed!");
    } else {
      console.log("Reports collection already has data. Skipping seed.");
    }
  } catch (error) {
    console.error("Failed to seed database: ", error);
  }
}
