import type { MaterialFamily, Swatch } from "../types.ts";

// Filter swatches: crops of the scanned textures or of a rendered object in that material.
export const familySwatch: Readonly<Record<MaterialFamily, Swatch>> = {
  wood: { texture: "oak_veneer_01" },
  stone: { texture: "Travertine004" },
  ceramic: { render: "cupola-lamp" },
  metal: { render: "tier-shelf" },
  glass: { render: "still-carafe" },
  textile: { texture: "poly_wool_herringbone" },
  leather: { texture: "brown_leather" },
};

export interface MaterialNote {
  readonly family: MaterialFamily;
  readonly texture: string;
  readonly title: Readonly<Record<"ru" | "en", string>>;
  readonly text: Readonly<Record<"ru" | "en", string>>;
}

// Editorial tiles between products; facts about the materials, not claims about the fictional brand.
export const materialNotes: readonly MaterialNote[] = [
  {
    family: "stone",
    texture: "Travertine004",
    title: { ru: "Травертин", en: "Travertine" },
    text: {
      ru: "Известняк, который осаждают горячие минеральные источники. Поры в нём остаются от пузырьков газа; их заполняют и шлифуют до матовой поверхности.",
      en: "A limestone laid down by hot mineral springs. Its pores are left by gas bubbles; they are filled and ground to a matte finish.",
    },
  },
  {
    family: "wood",
    texture: "oak_veneer_01",
    title: { ru: "Ясень, дуб и орех", en: "Ash, oak and walnut" },
    text: {
      ru: "Ясень светлый и упругий, дуб твёрдый и с заметным рисунком, орех тёмный и плотный. Масло оставляет дерево тёплым на ощупь, и его легко обновить дома.",
      en: "Ash is pale and springy, oak hard with a strong figure, walnut dark and dense. An oil finish keeps wood warm to the touch and is easy to renew at home.",
    },
  },
];
