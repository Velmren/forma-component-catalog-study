import type { Availability, AvailabilityFilter, Category, Locale, MaterialFamily, SortOrder } from "./types.ts";

const plural = {
  ru: new Intl.PluralRules("ru"),
  en: new Intl.PluralRules("en"),
};

// forms: RU one / few / many, EN one / other.
function count(locale: Locale, n: number, forms: readonly string[]): string {
  const rule = plural[locale].select(n);
  const form = locale === "ru" ? (rule === "one" ? forms[0] : rule === "few" ? forms[1] : forms[2]) : rule === "one" ? forms[0] : forms[1];
  return `${n} ${form}`;
}

const numberWords = {
  ru: ["", "Один", "Два", "Три", "Четыре", "Пять", "Шесть", "Семь", "Восемь", "Девять", "Десять", "Одиннадцать", "Двенадцать"],
  en: ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"],
};

const genitiveRu = ["", "одного", "двух", "трёх", "четырёх", "пяти", "шести", "семи", "восьми", "девяти", "десяти"];

export function formatPrice(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

export function formatNumber(value: number, locale: Locale, digits = 1): string {
  return new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-GB", { maximumFractionDigits: digits }).format(value);
}

const categoryNames: Record<Locale, Record<Category | "all", string>> = {
  ru: { all: "Все", seating: "Стулья и кресла", tables: "Столы", lighting: "Свет", storage: "Хранение", tableware: "Для стола", textiles: "Текстиль" },
  en: { all: "All", seating: "Seating", tables: "Tables", lighting: "Lighting", storage: "Storage", tableware: "Tableware", textiles: "Textiles" },
};

const familyNames: Record<Locale, Record<MaterialFamily, string>> = {
  ru: { wood: "Дерево", stone: "Камень", ceramic: "Керамика", metal: "Металл", glass: "Стекло", textile: "Ткань", leather: "Кожа" },
  en: { wood: "Wood", stone: "Stone", ceramic: "Ceramic", metal: "Metal", glass: "Glass", textile: "Textile", leather: "Leather" },
};

const sortNames: Record<Locale, Record<SortOrder, string>> = {
  ru: { curated: "По номеру", "price-asc": "Сначала дешевле", "price-desc": "Сначала дороже", "size-asc": "Сначала компактные" },
  en: { curated: "By number", "price-asc": "Price, low to high", "price-desc": "Price, high to low", "size-asc": "Smallest first" },
};

const availabilityNames: Record<Locale, Record<AvailabilityFilter, string>> = {
  ru: { all: "Любое наличие", "in-stock": "В наличии", "made-to-order": "Под заказ" },
  en: { all: "Any availability", "in-stock": "In stock", "made-to-order": "Made to order" },
};

function range(locale: Locale, [from, to]: readonly [number, number], unit: "days" | "weeks"): string {
  const forms = unit === "days" ? (locale === "ru" ? ["дня", "дня", "дней"] : ["day", "days"]) : locale === "ru" ? ["недели", "недели", "недель"] : ["week", "weeks"];
  return `${from}–${count(locale, to, forms)}`;
}

export function availabilityText(availability: Availability, locale: Locale): { readonly label: string; readonly detail: string } {
  const ru = locale === "ru";
  switch (availability.kind) {
    case "in-stock":
      return {
        label: ru ? "В наличии" : "In stock",
        detail: ru ? `Отправка за ${range(locale, availability.dispatchDays, "days")}` : `Ships in ${range(locale, availability.dispatchDays, "days")}`,
      };
    case "made-to-order":
      return {
        label: ru ? "Под заказ" : "Made to order",
        detail: ru ? `Изготовление ${range(locale, availability.leadWeeks, "weeks")}` : `Made in ${range(locale, availability.leadWeeks, "weeks")}`,
      };
    case "sold-out":
      return { label: ru ? "Нет в наличии" : "Sold out", detail: availability.restock[locale] };
  }
}

export const copy = {
  ru: {
    languageName: "Русский",
    language: "Язык",
    skip: "Перейти к каталогу",
    nav: { catalogue: "Каталог", compare: "Сравнение", selection: "Подборка" },
    intro: (objects: number, materials: number) =>
      `${numberWords.ru[objects] ?? objects} ${count("ru", objects, ["предмет", "предмета", "предметов"]).split(" ")[1]} из ${genitiveRu[materials] ?? materials} ${materials === 1 ? "материала" : "материалов"}`,
    introText:
      "Мебель, свет и вещи для стола. У каждого предмета указаны материалы по частям и точные размеры, а в сравнении предметы стоят рядом в одном масштабе.",
    materialIndex: "Материалы",
    categoryName: (category: Category | "all") => categoryNames.ru[category],
    familyName: (family: MaterialFamily) => familyNames.ru[family],
    sortName: (order: SortOrder) => sortNames.ru[order],
    availabilityName: (value: AvailabilityFilter) => availabilityNames.ru[value],
    objects: (n: number) => count("ru", n, ["предмет", "предмета", "предметов"]),
    search: "Поиск",
    searchPlaceholder: "Название или материал",
    filters: "Фильтры",
    material: "Материал",
    price: "Цена",
    priceFrom: "от",
    priceTo: "до",
    availability: "Наличие",
    sort: "Порядок",
    reset: "Сбросить",
    showResults: (n: number) => `Показать ${count("ru", n, ["предмет", "предмета", "предметов"])}`,
    removeFilter: (name: string) => `Убрать фильтр: ${name}`,
    emptyTitle: "Таких предметов нет",
    emptyText: "Ни один предмет не подходит под все условия сразу. Уберите часть фильтров или начните с материала.",
    add: "В подборку",
    addNamed: (name: string) => `Добавить «${name}» в подборку`,
    inSelection: (n: number) => `В подборке: ${n}`,
    atLimit: "Больше нет в наличии",
    unavailable: "Нельзя добавить",
    compare: "Сравнить",
    compareNamed: (name: string) => `Сравнить «${name}»`,
    compareFull: "Сравнить можно до четырёх предметов",
    decreaseNamed: (name: string) => `Убрать один «${name}»`,
    increaseNamed: (name: string) => `Добавить ещё один «${name}»`,
    removeNamed: (name: string) => `Убрать «${name}» из подборки`,
    quantity: "Количество",
    back: "Каталог",
    specs: "Характеристики",
    dimensions: "Размеры",
    widthDepthHeight: "Ш × Г × В",
    weight: "Вес",
    kg: "кг",
    cm: "см",
    materials: "Материалы",
    care: "Уход",
    drawing: "Чертёж с размерами",
    gallery: "Изображения",
    viewNames: { hero: "Вид спереди", angle: "Вид сверху под углом", detail: "Деталь", drawing: "Чертёж" },
    imageOf: (name: string, view: string) => `${name}: ${view.toLocaleLowerCase()}`,
    imageMissing: "Изображение не загрузилось",
    related: "Из того же материала",
    notFoundTitle: "Такого предмета нет в каталоге",
    notFoundText: "Возможно, ссылка устарела. Все двенадцать предметов на странице каталога.",
    toCatalogue: "Открыть каталог",
    selection: "Подборка",
    selectionEmpty: "Подборка пуста",
    selectionEmptyText: "Добавляйте предметы из каталога: здесь соберутся количество, сумма и самый долгий срок.",
    subtotal: "Итого",
    arrival: "Самое долгое ожидание",
    arrivalWeeks: (weeks: number, name: string) => `до ${count("ru", weeks, ["недели", "недель", "недель"])}, «${name}» под заказ`,
    arrivalDays: (days: number) => `до ${count("ru", days, ["дня", "дней", "дней"])}, всё в наличии`,
    clear: "Очистить",
    copyList: "Скопировать список",
    copied: "Список скопирован",
    copyFailed: "Не удалось скопировать",
    saved: "Сохраняется на этом устройстве",
    notSaved: "Браузер не даёт сохранять: подборка исчезнет после закрытия страницы",
    close: "Закрыть",
    noCheckout: "Это учебный каталог: оплаты и оформления заказа нет.",
    compareTitle: "Сравнение",
    compareEmpty: "Выберите два предмета или больше",
    compareEmptyText: "Отметьте «Сравнить» у предметов в каталоге. Сравнить можно до четырёх.",
    compareCount: (n: number) => `Сравнить ${count("ru", n, ["предмет", "предмета", "предметов"])}`,
    remove: "Убрать",
    toScale: "В одном масштабе",
    onlyDifferences: "Только различия",
    scaleNote: "Силуэты построены по тем же моделям, что и изображения; сетка 10 см.",
    footerNote: "FORMA: вымышленный каталог. Предметы, цены и наличие условные; изображения построены трёхмерным рендером.",
    status: (n: number, total: string) => `В подборке ${count("ru", n, ["предмет", "предмета", "предметов"])} на ${total}.`,
    added: (name: string) => `«${name}» в подборке`,
  },
  en: {
    languageName: "English",
    language: "Language",
    skip: "Skip to catalogue",
    nav: { catalogue: "Catalogue", compare: "Compare", selection: "Selection" },
    intro: (objects: number, materials: number) =>
      `${numberWords.en[objects] ?? objects} objects in ${numberWords.en[materials]?.toLocaleLowerCase() ?? materials} materials`,
    introText:
      "Furniture, light and things for the table. Every object lists its materials part by part and its exact dimensions, and comparison puts them side by side at one scale.",
    materialIndex: "Materials",
    categoryName: (category: Category | "all") => categoryNames.en[category],
    familyName: (family: MaterialFamily) => familyNames.en[family],
    sortName: (order: SortOrder) => sortNames.en[order],
    availabilityName: (value: AvailabilityFilter) => availabilityNames.en[value],
    objects: (n: number) => count("en", n, ["object", "objects"]),
    search: "Search",
    searchPlaceholder: "Name or material",
    filters: "Filters",
    material: "Material",
    price: "Price",
    priceFrom: "from",
    priceTo: "to",
    availability: "Availability",
    sort: "Order",
    reset: "Reset",
    showResults: (n: number) => `Show ${count("en", n, ["object", "objects"])}`,
    removeFilter: (name: string) => `Remove filter: ${name}`,
    emptyTitle: "No objects match",
    emptyText: "Nothing meets every condition at once. Remove a filter or start from a material.",
    add: "Add",
    addNamed: (name: string) => `Add ${name} to selection`,
    inSelection: (n: number) => `In selection: ${n}`,
    atLimit: "No more in stock",
    unavailable: "Unavailable",
    compare: "Compare",
    compareNamed: (name: string) => `Compare ${name}`,
    compareFull: "Up to four objects can be compared",
    decreaseNamed: (name: string) => `Remove one ${name}`,
    increaseNamed: (name: string) => `Add one more ${name}`,
    removeNamed: (name: string) => `Remove ${name} from selection`,
    quantity: "Quantity",
    back: "Catalogue",
    specs: "Specifications",
    dimensions: "Dimensions",
    widthDepthHeight: "W × D × H",
    weight: "Weight",
    kg: "kg",
    cm: "cm",
    materials: "Materials",
    care: "Care",
    drawing: "Dimensioned drawing",
    gallery: "Images",
    viewNames: { hero: "Front view", angle: "Three-quarter view from above", detail: "Detail", drawing: "Drawing" },
    imageOf: (name: string, view: string) => `${name}: ${view.toLocaleLowerCase()}`,
    imageMissing: "Image failed to load",
    related: "In the same material",
    notFoundTitle: "This object is not in the catalogue",
    notFoundText: "The link may be out of date. All twelve objects are on the catalogue page.",
    toCatalogue: "Open catalogue",
    selection: "Selection",
    selectionEmpty: "Your selection is empty",
    selectionEmptyText: "Add objects from the catalogue to see quantities, the total and the longest wait.",
    subtotal: "Total",
    arrival: "Longest wait",
    arrivalWeeks: (weeks: number, name: string) => `up to ${count("en", weeks, ["week", "weeks"])}, ${name} is made to order`,
    arrivalDays: (days: number) => `up to ${count("en", days, ["day", "days"])}, everything in stock`,
    clear: "Clear",
    copyList: "Copy list",
    copied: "List copied",
    copyFailed: "Could not copy",
    saved: "Saved on this device",
    notSaved: "This browser blocks storage: the selection will be lost when the page closes",
    close: "Close",
    noCheckout: "This is a study catalogue: there is no payment or checkout.",
    compareTitle: "Compare",
    compareEmpty: "Pick two or more objects",
    compareEmptyText: "Tick Compare on objects in the catalogue. Up to four can sit side by side.",
    compareCount: (n: number) => `Compare ${count("en", n, ["object", "objects"])}`,
    remove: "Remove",
    toScale: "At one scale",
    onlyDifferences: "Differences only",
    scaleNote: "Outlines come from the same models as the images; grid is 10 cm.",
    footerNote: "FORMA is a fictional catalogue. Objects, prices and stock are illustrative; images are 3D renders.",
    status: (n: number, total: string) => `${count("en", n, ["object", "objects"])} in selection, ${total}.`,
    added: (name: string) => `${name} added to selection`,
  },
} as const;

export type Copy = (typeof copy)[Locale];
