import type { PlaybackSource } from "./media";

export type ResolutionPurpose =
  "playback" | "download-video" | "download-audio";
export type DownloadFormat = "mp4" | "audio";

/** Existing records used video-ID filenames; new records preserve the actual output. */
export function storedDownloadFileName(item: {
  videoId: string;
  format: DownloadFormat;
  fileName?: string;
}): string {
  return (
    item.fileName ??
    `${item.videoId}.${item.format === "audio" ? "m4a" : "mp4"}`
  );
}
export interface DownloadSource {
  source: PlaybackSource;
  extension: "mp4" | "m4a" | "webm" | "mp3" | "ogg";
  mimeType: string;
}

/** Select a real single-file output; naming a file never performs conversion. */
export function selectDownloadSource(
  sources: PlaybackSource[],
  format: DownloadFormat,
  now = Date.now(),
): DownloadSource | null {
  const valid = sources.filter((source) => {
    try {
      return (
        new URL(source.uri).protocol === "https:" &&
        (source.expiresAt === undefined ||
          (Number.isFinite(source.expiresAt) && source.expiresAt > now))
      );
    } catch {
      return false;
    }
  });
  const outputs =
    format === "mp4"
      ? [
          {
            container: "mp4",
            extension: "mp4",
            mimeType: "video/mp4",
            type: "progressive",
          },
        ]
      : [
          {
            container: "mp4",
            extension: "m4a",
            mimeType: "audio/mp4",
            type: "audio",
          },
          {
            container: "webm",
            extension: "webm",
            mimeType: "audio/webm",
            type: "audio",
          },
          {
            container: "mp3",
            extension: "mp3",
            mimeType: "audio/mpeg",
            type: "audio",
          },
          {
            container: "ogg",
            extension: "ogg",
            mimeType: "audio/ogg",
            type: "audio",
          },
        ];
  for (const output of outputs) {
    const source = valid.find((candidate) => {
      const mime = candidate.mimeType?.split(";")[0].trim().toLowerCase();
      return (
        candidate.contentType === output.type &&
        (candidate.container === output.container ||
          (!candidate.container && mime === output.mimeType)) &&
        (!mime || mime === output.mimeType)
      );
    });
    if (source)
      return {
        source,
        extension: output.extension as DownloadSource["extension"],
        mimeType: output.mimeType,
      };
  }
  return null;
}
