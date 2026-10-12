import { randomUUID } from "node:crypto";
import { MongoServerError } from "mongodb";
import { database, dataPath, insertRecord, removeRecord } from "./storage.js";
interface LeaseDocument {
  _id: string;
  token: string;
  expires: Date;
}
export async function acquirePayrollLease(env: NodeJS.ProcessEnv) {
  const token = randomUUID();
  if (!process.env.MONGODB_URI) {
    const path = dataPath(env, "payroll-lease.json");
    if (!(await insertRecord(path, { token, pid: process.pid })))
      throw new Error("Payroll execution is already locked.");
    return {
      assertHeld: async () => {},
      release: async () => removeRecord(path),
    };
  }
  const collection = (await database()).collection<LeaseDocument>("leases");
  const id = `${env.CONFIANCE_STORAGE_NAMESPACE || "confiance-local"}:payroll`;
  const now = new Date();
  try {
    const lease = await collection.findOneAndUpdate(
      { _id: id, expires: { $lt: now } },
      { $set: { token, expires: new Date(Date.now() + 600000) } },
      { upsert: true, returnDocument: "after" },
    );
    if (lease?.token !== token)
      throw new Error("Payroll execution is already locked.");
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000)
      throw new Error("Payroll execution is already locked.");
    throw error;
  }
  let lost = false;
  const timer = setInterval(() => {
    void collection
      .updateOne(
        { _id: id, token },
        { $set: { expires: new Date(Date.now() + 600000) } },
      )
      .then((r) => {
        if (r.matchedCount !== 1) lost = true;
      })
      .catch(() => {
        lost = true;
      });
  }, 30000);
  return {
    assertHeld: async () => {
      if (
        lost ||
        !(await collection.findOne({
          _id: id,
          token,
          expires: { $gt: new Date() },
        }))
      )
        throw new Error("Payroll execution lease was lost.");
    },
    release: async () => {
      clearInterval(timer);
      await collection.deleteOne({ _id: id, token });
    },
  };
}
