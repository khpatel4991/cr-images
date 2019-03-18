import * as extractFrames from "ffmpeg-extract-frames";
import * as pixelmatch from "pixelmatch";
import { inspect } from "util";
import { createInterface } from "readline";
import {
  createReadStream,
  readFileSync,
  writeFileSync,
  createWriteStream
} from "fs";
import * as jpegjs from "jpeg-js";
import * as pngjs from "pngjs";

process.stdin.setEncoding("utf-8");

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

const sModifier = (offset: number) => (offset / 1000).toPrecision();

const generateFrames = async (
  start: number,
  frames: number,
  hz: number
): Promise<Array<string>> => {
  const map = new Map<string, string>();
  const end = frames * hz + start;
  try {
    const offsets: Array<number> = Array.from(
      Array(frames),
      (_, i) => start + i * hz
    );
    const timemarks: Array<string> = offsets.map(sModifier);
    const paths: Array<string> = timemarks.map(
      (timemark, i) =>
        `/home/kashyap/dev/cr-image/media/frames/clip-${i + 1}-${timemark}.jpg`
    );
    console.time(`${start}ms => ${end}ms`);
    await extractFrames({
      input: "./media/clip.mp4",
      output: "./media/frames/clip-%i-%s.jpg",
      offsets
    });
    console.timeEnd(`${start}ms => ${end}ms`);
    return paths;
  } catch (e) {
    return [];
  }
};

const main = async () => {
  const start = 3400; // milliseconds
  const frames = 300;
  const hz = 16;
  const end = frames * hz + start;
  console.log(
    `Generating ${(start / 1000).toPrecision()}s => ${(
      end / 1000
    ).toPrecision()}s`
  );
  const paths = await generateFrames(start, frames, hz);
  console.log(`Generated ${paths.length} frames.`);
  if (paths.length === 0) {
    process.exit(1);
  }
  const pairs = paths.slice(1).map((p, i) => [paths[i], p]);
  pairs.forEach(([path1, path2], i) => {
    const jpgData1 = readFileSync(path1);
    const jpgData2 = readFileSync(path2);
    const imageData1: Uint8Array = jpegjs.decode(jpgData1).data;
    const imageData2: Uint8Array = jpegjs.decode(jpgData2).data;
    const diff = new pngjs.PNG({ width: 720, height: 1480 });
    pixelmatch(imageData1, imageData2, diff.data, 720, 1480, {
      threshold: 0.1
    });
    diff
      .pack()
      .pipe(
        createWriteStream(
          `/home/kashyap/dev/cr-image/media/diffs/diff-${i}.png`
        )
      );
  });
};

main();
