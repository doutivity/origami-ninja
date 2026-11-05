/** SVG-рядок → HTMLImageElement (для генерації текстур Phaser один раз у BootScene). */
export async function rasterize(svg: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  return img;
}

export const svgDoc = (w: number, h: number, viewBox: string, inner: string): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${viewBox}">${inner}</svg>`;
