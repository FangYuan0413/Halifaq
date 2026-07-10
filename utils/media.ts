// Reads a video File's duration (in seconds) without uploading it anywhere
// — loads it into an off-DOM <video> element just long enough to read
// `duration` off its metadata, then cleans up the object URL. Used to
// enforce a max video length on top of the existing max file size.
export function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn't read video metadata."));
    };

    video.src = url;
  });
}
