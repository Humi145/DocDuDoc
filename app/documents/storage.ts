import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export class DocumentFileNotFoundError extends Error {
  constructor() {
    super("Le fichier PDF est introuvable.");
    this.name = "DocumentFileNotFoundError";
  }
}

function getPdfPath(key: string) {
  const storageDirectory = join(process.cwd(), ".local-storage", "documents");
  const filePath = resolve(storageDirectory, key);
  const relativePath = relative(storageDirectory, filePath);

  if (
    !key ||
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error("La clé de stockage du document est invalide.");
  }

  return filePath;
}

export async function storePdf(key: string, body: Buffer) {
  const filePath = getPdfPath(key);
  await mkdir(dirname(filePath), { recursive: true, mode: 0o700 });
  await writeFile(filePath, body, { flag: "wx", mode: 0o600 });
}

export async function getPdf(key: string) {
  try {
    return await readFile(getPdfPath(key));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      throw new DocumentFileNotFoundError();
    }
    throw error;
  }
}

export async function deletePdf(key: string) {
  await rm(getPdfPath(key), { force: true });
}
