import * as ImageManipulator from 'expo-image-manipulator';
import { INPUT_SIZE } from '../constants/models';

/**
 * Preprocess an image for YOLO inference.
 *
 * 1. Resize to 640x640 using expo-image-manipulator (saved as JPEG)
 * 2. Decode JPEG base64 to raw pixel data using a bitmap approach
 * 3. Convert HWC uint8 RGB -> CHW float32 normalized [0, 1]
 *
 * We use JPEG output and a simple pixel extraction to avoid
 * the slow custom PNG/DEFLATE decompressor.
 */
export async function preprocessImage(
  imageUri: string,
  inputSize: number = INPUT_SIZE
): Promise<{
  inputTensor: Float32Array;
  originalWidth: number;
  originalHeight: number;
}> {
  const t0 = Date.now();

  // Get original image dimensions
  const originalImage = await ImageManipulator.manipulateAsync(imageUri, []);
  const originalWidth = originalImage.width;
  const originalHeight = originalImage.height;
  console.log(`[preprocess] dims: ${Date.now() - t0}ms`);

  // Resize to inputSize x inputSize and get base64 PNG
  const t1 = Date.now();
  const resized = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { width: inputSize, height: inputSize } }],
    { format: ImageManipulator.SaveFormat.PNG, base64: true }
  );
  console.log(`[preprocess] resize+b64: ${Date.now() - t1}ms (b64 len=${resized.base64?.length})`);

  if (!resized.base64) {
    throw new Error('Failed to get base64 image data');
  }

  // Decode base64 to bytes
  const t2 = Date.now();
  const binaryString = atob(resized.base64);
  const pngBytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    pngBytes[i] = binaryString.charCodeAt(i);
  }
  console.log(`[preprocess] atob: ${Date.now() - t2}ms (${pngBytes.length} bytes)`);

  // Extract RGBA pixels from PNG
  const t3 = Date.now();
  let rgba: Uint8Array;
  try {
    rgba = decodePNGToRGBA(pngBytes, inputSize, inputSize);
  } catch (e) {
    console.error(`[preprocess] PNG decode FAILED: ${e}`);
    throw e;
  }
  console.log(`[preprocess] PNG decode: ${Date.now() - t3}ms`);

  // Convert RGBA HWC -> RGB CHW float32 normalized
  const t4 = Date.now();
  const inputTensor = new Float32Array(3 * inputSize * inputSize);
  const pixelCount = inputSize * inputSize;

  for (let i = 0; i < pixelCount; i++) {
    const base = i * 4;
    inputTensor[i] = rgba[base] / 255.0;                     // R channel
    inputTensor[pixelCount + i] = rgba[base + 1] / 255.0;    // G channel
    inputTensor[2 * pixelCount + i] = rgba[base + 2] / 255.0; // B channel
  }
  console.log(`[preprocess] tensor build: ${Date.now() - t4}ms`);
  console.log(`[preprocess] TOTAL: ${Date.now() - t0}ms`);

  return { inputTensor, originalWidth, originalHeight };
}

// ── PNG Decoder ────────────────────────────────────────────────────────

function decodePNGToRGBA(
  data: Uint8Array,
  expectedWidth: number,
  expectedHeight: number
): Uint8Array {
  // Verify PNG signature
  if (
    data[0] !== 137 || data[1] !== 80 || data[2] !== 78 || data[3] !== 71
  ) {
    throw new Error('Invalid PNG signature');
  }

  let offset = 8;
  let colorType = 6;
  let bitDepth = 8;
  const idatChunks: Uint8Array[] = [];

  while (offset < data.length) {
    const chunkLength =
      ((data[offset] << 24) | (data[offset + 1] << 16) |
       (data[offset + 2] << 8) | data[offset + 3]) >>> 0;
    const chunkType = String.fromCharCode(
      data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]
    );

    if (chunkType === 'IHDR') {
      bitDepth = data[offset + 16];
      colorType = data[offset + 17];
    } else if (chunkType === 'IDAT') {
      idatChunks.push(data.subarray(offset + 8, offset + 8 + chunkLength));
    } else if (chunkType === 'IEND') {
      break;
    }

    offset += 12 + chunkLength;
  }

  // Concatenate IDAT chunks
  const totalLen = idatChunks.reduce((sum, c) => sum + c.length, 0);
  const compressed = new Uint8Array(totalLen);
  let pos = 0;
  for (const chunk of idatChunks) {
    compressed.set(chunk, pos);
    pos += chunk.length;
  }

  // Decompress zlib data
  const rawData = inflateZlib(compressed);

  const channels = colorType === 6 ? 4 : 3;
  const stride = channels * expectedWidth;
  const pixels = new Uint8Array(expectedWidth * expectedHeight * 4);

  // Reconstruct filtered scanlines
  for (let y = 0; y < expectedHeight; y++) {
    const filterByte = rawData[y * (stride + 1)];
    const rowOffset = y * (stride + 1) + 1;
    const prevRowBase = (y - 1) * expectedWidth * 4;

    for (let x = 0; x < expectedWidth; x++) {
      const srcIdx = rowOffset + x * channels;
      const dstIdx = (y * expectedWidth + x) * 4;

      let r = rawData[srcIdx];
      let g = rawData[srcIdx + 1];
      let b = rawData[srcIdx + 2];
      let a = channels === 4 ? rawData[srcIdx + 3] : 255;

      if (filterByte === 1) {
        // Sub
        if (x > 0) {
          r = (r + pixels[dstIdx - 4]) & 0xff;
          g = (g + pixels[dstIdx - 3]) & 0xff;
          b = (b + pixels[dstIdx - 2]) & 0xff;
          if (channels === 4) a = (a + pixels[dstIdx - 1]) & 0xff;
        }
      } else if (filterByte === 2) {
        // Up
        if (y > 0) {
          r = (r + pixels[prevRowBase + x * 4]) & 0xff;
          g = (g + pixels[prevRowBase + x * 4 + 1]) & 0xff;
          b = (b + pixels[prevRowBase + x * 4 + 2]) & 0xff;
          if (channels === 4) a = (a + pixels[prevRowBase + x * 4 + 3]) & 0xff;
        }
      } else if (filterByte === 3) {
        // Average
        const lR = x > 0 ? pixels[dstIdx - 4] : 0;
        const lG = x > 0 ? pixels[dstIdx - 3] : 0;
        const lB = x > 0 ? pixels[dstIdx - 2] : 0;
        const lA = x > 0 ? pixels[dstIdx - 1] : 0;
        const uR = y > 0 ? pixels[prevRowBase + x * 4] : 0;
        const uG = y > 0 ? pixels[prevRowBase + x * 4 + 1] : 0;
        const uB = y > 0 ? pixels[prevRowBase + x * 4 + 2] : 0;
        const uA = y > 0 ? pixels[prevRowBase + x * 4 + 3] : 0;
        r = (r + ((lR + uR) >> 1)) & 0xff;
        g = (g + ((lG + uG) >> 1)) & 0xff;
        b = (b + ((lB + uB) >> 1)) & 0xff;
        if (channels === 4) a = (a + ((lA + uA) >> 1)) & 0xff;
      } else if (filterByte === 4) {
        // Paeth
        const lR = x > 0 ? pixels[dstIdx - 4] : 0;
        const lG = x > 0 ? pixels[dstIdx - 3] : 0;
        const lB = x > 0 ? pixels[dstIdx - 2] : 0;
        const lA = x > 0 ? pixels[dstIdx - 1] : 0;
        const uR = y > 0 ? pixels[prevRowBase + x * 4] : 0;
        const uG = y > 0 ? pixels[prevRowBase + x * 4 + 1] : 0;
        const uB = y > 0 ? pixels[prevRowBase + x * 4 + 2] : 0;
        const uA = y > 0 ? pixels[prevRowBase + x * 4 + 3] : 0;
        const ulR = (x > 0 && y > 0) ? pixels[prevRowBase + (x - 1) * 4] : 0;
        const ulG = (x > 0 && y > 0) ? pixels[prevRowBase + (x - 1) * 4 + 1] : 0;
        const ulB = (x > 0 && y > 0) ? pixels[prevRowBase + (x - 1) * 4 + 2] : 0;
        const ulA = (x > 0 && y > 0) ? pixels[prevRowBase + (x - 1) * 4 + 3] : 0;
        r = (r + paethPredictor(lR, uR, ulR)) & 0xff;
        g = (g + paethPredictor(lG, uG, ulG)) & 0xff;
        b = (b + paethPredictor(lB, uB, ulB)) & 0xff;
        if (channels === 4) a = (a + paethPredictor(lA, uA, ulA)) & 0xff;
      }

      pixels[dstIdx] = r;
      pixels[dstIdx + 1] = g;
      pixels[dstIdx + 2] = b;
      pixels[dstIdx + 3] = a;
    }
  }

  return pixels;
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// ── Fast DEFLATE Decompressor ──────────────────────────────────────────
// Uses pre-allocated output buffer and typed arrays for performance.

function inflateZlib(data: Uint8Array): Uint8Array {
  // Skip zlib header: 2 bytes (CMF, FLG) + optional 4-byte DICTID if FDICT set
  const flg = data[1];
  const fdict = (flg >> 5) & 1;
  const headerSize = 2 + (fdict ? 4 : 0);
  return inflate(data, headerSize);
}

function inflate(data: Uint8Array, startOffset: number): Uint8Array {
  // Pre-allocate output buffer (640x640 RGBA + filter bytes ≈ 1.64MB)
  // Use 2MB initial, grow if needed
  let outBuf = new Uint8Array(2 * 1024 * 1024);
  let outPos = 0;

  let bytePos = startOffset;
  let bitBuf = 0;
  let bitCount = 0;

  function ensureOutput(needed: number) {
    if (outPos + needed > outBuf.length) {
      const newBuf = new Uint8Array(outBuf.length * 2);
      newBuf.set(outBuf);
      outBuf = newBuf;
    }
  }

  function fillBits(n: number) {
    while (bitCount < n) {
      if (bytePos < data.length) {
        bitBuf |= data[bytePos++] << bitCount;
      }
      bitCount += 8;
    }
  }

  function readBits(n: number): number {
    fillBits(n);
    const val = bitBuf & ((1 << n) - 1);
    bitBuf >>= n;
    bitCount -= n;
    return val;
  }

  // Build Huffman lookup table using fast bit-reversal approach
  function buildTable(lengths: Uint8Array, maxSym: number): Uint16Array {
    // Find max code length
    let maxLen = 0;
    for (let i = 0; i < maxSym; i++) {
      if (lengths[i] > maxLen) maxLen = lengths[i];
    }
    if (maxLen === 0) return new Uint16Array(1);

    // Count code lengths
    const blCount = new Uint16Array(maxLen + 1);
    for (let i = 0; i < maxSym; i++) {
      if (lengths[i]) blCount[lengths[i]]++;
    }

    // Compute first code of each length
    const nextCode = new Uint16Array(maxLen + 1);
    for (let bits = 1; bits <= maxLen; bits++) {
      nextCode[bits] = (nextCode[bits - 1] + blCount[bits - 1]) << 1;
    }

    // Build lookup table (size 2^maxLen)
    const tableSize = 1 << maxLen;
    const table = new Uint16Array(tableSize);
    // Fill with sentinel
    table.fill(0xFFFF);

    for (let sym = 0; sym < maxSym; sym++) {
      const len = lengths[sym];
      if (len === 0) continue;
      let code = nextCode[len]++;
      // Reverse bits for table lookup
      let rev = 0;
      for (let i = 0; i < len; i++) {
        rev = (rev << 1) | (code & 1);
        code >>= 1;
      }
      // Entry: (symbol << 4) | length
      const entry = (sym << 4) | len;
      const step = 1 << len;
      for (let i = rev; i < tableSize; i += step) {
        table[i] = entry;
      }
    }

    return table;
  }

  function decodeSymbol(table: Uint16Array, maxLen: number): number {
    fillBits(maxLen);
    const idx = bitBuf & ((1 << maxLen) - 1);
    const entry = table[idx];
    const len = entry & 0xF;
    const sym = entry >> 4;
    bitBuf >>= len;
    bitCount -= len;
    return sym;
  }

  // Fixed Huffman tables
  const fixedLitLens = new Uint8Array(288);
  for (let i = 0; i <= 143; i++) fixedLitLens[i] = 8;
  for (let i = 144; i <= 255; i++) fixedLitLens[i] = 9;
  for (let i = 256; i <= 279; i++) fixedLitLens[i] = 7;
  for (let i = 280; i <= 287; i++) fixedLitLens[i] = 8;
  const fixedDistLens = new Uint8Array(32);
  for (let i = 0; i < 32; i++) fixedDistLens[i] = 5;

  const fixedLitTable = buildTable(fixedLitLens, 288);
  const fixedDistTable = buildTable(fixedDistLens, 32);

  const lenBase = [
    3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,
    35,43,51,59,67,83,99,115,131,163,195,227,258
  ];
  const lenExtra = [
    0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,
    3,3,3,3,4,4,4,4,5,5,5,5,0
  ];
  const distBase = [
    1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,
    257,385,513,769,1025,1537,2049,3073,4097,6145,
    8193,12289,16385,24577
  ];
  const distExtra = [
    0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,
    7,7,8,8,9,9,10,10,11,11,12,12,13,13
  ];
  const clOrder = [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];

  let bfinal = 0;
  do {
    bfinal = readBits(1);
    const btype = readBits(2);

    if (btype === 0) {
      // Stored block — align to byte boundary
      bitBuf = 0;
      bitCount = 0;
      const len = data[bytePos] | (data[bytePos + 1] << 8);
      bytePos += 4; // skip len and nlen
      ensureOutput(len);
      for (let i = 0; i < len; i++) {
        outBuf[outPos++] = data[bytePos++];
      }
    } else {
      let litTable: Uint16Array;
      let dstTable: Uint16Array;
      let litMaxLen: number;
      let dstMaxLen: number;

      if (btype === 1) {
        litTable = fixedLitTable;
        dstTable = fixedDistTable;
        litMaxLen = 9;
        dstMaxLen = 5;
      } else {
        // Dynamic Huffman
        const hlit = readBits(5) + 257;
        const hdist = readBits(5) + 1;
        const hclen = readBits(4) + 4;

        const clLens = new Uint8Array(19);
        for (let i = 0; i < hclen; i++) {
          clLens[clOrder[i]] = readBits(3);
        }

        let clMaxLen = 0;
        for (let i = 0; i < 19; i++) {
          if (clLens[i] > clMaxLen) clMaxLen = clLens[i];
        }
        const clTable = buildTable(clLens, 19);

        const allLens = new Uint8Array(hlit + hdist);
        let idx = 0;
        while (idx < hlit + hdist) {
          const sym = decodeSymbol(clTable, clMaxLen);
          if (sym < 16) {
            allLens[idx++] = sym;
          } else if (sym === 16) {
            const rep = readBits(2) + 3;
            const prev = allLens[idx - 1];
            for (let r = 0; r < rep; r++) allLens[idx++] = prev;
          } else if (sym === 17) {
            const rep = readBits(3) + 3;
            idx += rep; // already zero-filled
          } else {
            const rep = readBits(7) + 11;
            idx += rep;
          }
        }

        litMaxLen = 0;
        for (let i = 0; i < hlit; i++) {
          if (allLens[i] > litMaxLen) litMaxLen = allLens[i];
        }
        dstMaxLen = 0;
        for (let i = hlit; i < hlit + hdist; i++) {
          if (allLens[i] > dstMaxLen) dstMaxLen = allLens[i];
        }

        litTable = buildTable(allLens.subarray(0, hlit), hlit);
        dstTable = buildTable(allLens.subarray(hlit), hdist);
      }

      // Decode compressed data
      while (true) {
        const sym = decodeSymbol(litTable, litMaxLen);

        if (sym === 256) break;

        if (sym < 256) {
          ensureOutput(1);
          outBuf[outPos++] = sym;
        } else {
          const li = sym - 257;
          const length = lenBase[li] + (lenExtra[li] ? readBits(lenExtra[li]) : 0);
          const di = decodeSymbol(dstTable, dstMaxLen);
          const distance = distBase[di] + (distExtra[di] ? readBits(distExtra[di]) : 0);

          ensureOutput(length);
          // Copy from output buffer (may overlap)
          const srcStart = outPos - distance;
          for (let i = 0; i < length; i++) {
            outBuf[outPos++] = outBuf[srcStart + i];
          }
        }
      }
    }
  } while (!bfinal);

  return outBuf.subarray(0, outPos);
}
