// Vercel Function entry (DEC-D): the whole Hono app behind one stateless function.
import { handle } from "hono/vercel";
import { app } from "../src/app.js";

export const config = { maxDuration: 60 };
export default handle(app);
