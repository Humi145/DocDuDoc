import { auth } from "@/app/libs/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);

// en gros better auth va gérer les routes pour nous, on a juste à l'exporter et nextjs va s'occuper de tout le reste