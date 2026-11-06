import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export class DocumentStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentStorageConfigurationError";
  }
}

let client: S3Client | undefined;

function getStorageConfig() {
  const endpoint = process.env.DOCUMENTS_S3_ENDPOINT;
  const region = process.env.DOCUMENTS_S3_REGION;
  const bucket = process.env.DOCUMENTS_S3_BUCKET;
  const accessKeyId = process.env.DOCUMENTS_S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.DOCUMENTS_S3_SECRET_ACCESS_KEY;

  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new DocumentStorageConfigurationError(
      "Le stockage des documents n’est pas configuré.",
    );
  }

  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new DocumentStorageConfigurationError(
      "L’URL du stockage des documents est invalide.",
    );
  }

  const isLocalEndpoint = ["localhost", "127.0.0.1", "::1"].includes(
    endpointUrl.hostname,
  );
  if (endpointUrl.protocol !== "https:" && !isLocalEndpoint) {
    throw new DocumentStorageConfigurationError(
      "Le stockage des documents doit utiliser HTTPS.",
    );
  }

  if (!client) {
    client = new S3Client({
      endpoint: endpointUrl.toString(),
      region,
      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  return { client, bucket };
}

export async function storePdf(key: string, body: Buffer) {
  const { client: storageClient, bucket } = getStorageConfig();
  await storageClient.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentLength: body.byteLength,
      ContentType: "application/pdf",
    }),
  );
}

export async function getPdf(key: string) {
  const { client: storageClient, bucket } = getStorageConfig();
  return storageClient.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

export async function deletePdf(key: string) {
  const { client: storageClient, bucket } = getStorageConfig();
  await storageClient.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}
