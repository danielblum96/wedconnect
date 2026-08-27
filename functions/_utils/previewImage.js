// A checkout-elonezet kép (kliensoldalon, canvas.toDataURL()-lel generált PNG,
// "data:image/png;base64,..." formátumban) szerver-oldali dekódolása D1 BLOB
// mentéshez. Null-t ad vissza hiányzó/érvénytelen bemenetre - a kép csak
// dísz-elem a Stripe checkout oldalon, sosem szabad emiatt elbuknia a rendelésnek.
export function decodeBase64Png(dataUrl) {
  if (!dataUrl || !dataUrl.startsWith("data:image/png;base64,")) return null;
  try {
    const base64 = dataUrl.slice("data:image/png;base64,".length);
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  } catch (e) {
    return null;
  }
}
