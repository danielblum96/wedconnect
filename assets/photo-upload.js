// Kliens-oldali kép-átméretezés és WebP-konverzió a pár esküvői oldalának
// borítóképéhez - a Cloudflare Pages Functions futtatókörnyezet nem tud natívan
// képet feldolgozni, ezért ez a böngésző <canvas>-ában történik, feltöltés előtt.
const MAX_WIDTH = 1600;
const WEBP_QUALITY = 0.82;

export function resizeImageToWebp(file, maxWidth = MAX_WIDTH) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const width = Math.max(1, Math.round(img.naturalWidth * scale));
      const height = Math.max(1, Math.round(img.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("canvas toBlob failed"));
        },
        "image/webp",
        WEBP_QUALITY
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("image load failed"));
    };
    img.src = objectUrl;
  });
}
