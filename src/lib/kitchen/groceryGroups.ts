import type { GroceryCategory, GroceryItem } from "./types";

/** Store-shopping order for department headings. */
export const GROCERY_GROUPS: GroceryCategory[] = [
  "produce",
  "bakery",
  "meat",
  "dairy",
  "frozen",
  "pantry",
  "household",
  "other",
];

export const GROCERY_GROUP_LABEL: Record<GroceryCategory, string> = {
  produce: "Produce",
  bakery: "Bakery",
  meat: "Meat & Seafood",
  dairy: "Dairy & Eggs",
  frozen: "Frozen",
  pantry: "Pantry",
  household: "Household",
  other: "Other",
};

const KW: [GroceryCategory, string[]][] = [
  [
    "produce",
    [
      "apple", "banana", "orange", "lemon", "lime", "grape", "berries", "berry",
      "strawberr", "blueberr", "raspberr", "peach", "pear", "plum", "melon",
      "watermelon", "pineapple", "mango", "avocado", "tomato", "potato",
      "onion", "garlic", "pepper", "jalape", "carrot", "celery", "cucumber",
      "lettuce", "salad", "spinach", "kale", "greens", "broccoli", "cauliflower",
      "zucchini", "squash", "eggplant", "corn", "mushroom", "cabbage", "leek",
      "green bean", "asparagus", "herb", "cilantro", "parsley", "basil",
      "ginger", "scallion", "shallot", "radish", "beet", "sweet potato", "yam",
      "brussels", "artichoke", "fruit", "vegetable", "veggie", "salad mix",
    ],
  ],
  [
    "bakery",
    [
      "bread", "bagel", "bun", "roll", "tortilla", "pita", "croissant",
      "muffin", "donut", "baguette", "english muffin", "tortillas", "wraps",
      "hamburger bun", "hot dog bun", "cake", "pie crust", "naan",
    ],
  ],
  [
    "meat",
    [
      "chicken", "beef", "ground beef", "steak", "pork", "bacon", "sausage",
      "ham", "turkey", "lamb", "fish", "salmon", "tuna steak", "shrimp",
      "tilapia", "cod", "meatball", "hot dog", "deli", "pepperoni", "chorizo",
      "ribs", "roast", "brisket", "thigh", "breast", "wing", "drumstick",
      "ground turkey", "ground pork", "prosciutto", "salami", "crab", "lobster",
    ],
  ],
  [
    "dairy",
    [
      "milk", "cheese", "cheddar", "mozzarella", "parmesan", "cream", "butter",
      "yogurt", "egg", "eggs", "sour cream", "cottage cheese", "cream cheese",
      "half and half", "heavy cream", "whipping cream", "ricotta", "feta",
      "goat cheese", "margarine", "buttermilk", "whipped cream",
    ],
  ],
  [
    "frozen",
    [
      "frozen", "ice cream", "popsicle", "frozen pizza", "frozen vegetables",
      "frozen fruit", "frozen berries", "frozen peas", "frozen corn",
      "frozen fries", "french fries", "tater tot", "frozen dinner",
      "frozen meal", "gelato", "sorbet", "frozen waffles", "fish stick",
    ],
  ],
  [
    "pantry",
    [
      "rice", "pasta", "spaghetti", "noodle", "flour", "sugar", "salt",
      "pepper", "oil", "olive oil", "vinegar", "sauce", "salsa", "ketchup",
      "mustard", "mayo", "mayonnaise", "soy sauce", "hot sauce", "spice",
      "cumin", "paprika", "oregano", "cinnamon", "baking soda",
      "baking powder", "yeast", "vanilla", "chocolate chip", "cocoa",
      "canned", "can of", "beans", "black beans", "pinto", "chickpea",
      "lentil", "soup", "broth", "stock", "cereal", "oatmeal", "oats",
      "granola", "peanut butter", "jelly", "jam", "honey", "syrup",
      "maple syrup", "chip", "crackers", "pretzel", "popcorn", "nut",
      "almond", "walnut", "raisin", "dried", "tomato sauce", "tomato paste",
      "diced tomatoes", "enchilada sauce", "taco seasoning", "seasoning",
      "gravy", "stuffing", "breadcrumb", "panko", "cornmeal", "masa",
      "tortilla chip", "salsa", "pickle", "olive", "coffee", "tea",
      "juice", "soda", "water bottle", "sparkling water", "gatorade",
      "tuna", "sardine", "mac and cheese", "macaroni", "ramen", "couscous",
      "quinoa", "barley", "cornstarch", "frosting", "sprinkles",
      "brown sugar", "powdered sugar", "molasses", "coconut milk",
    ],
  ],
  [
    "household",
    [
      "paper towel", "toilet paper", "tissue", "napkin", "paper plate",
      "plastic wrap", "foil", "aluminum foil", "parchment", "ziploc",
      "bag", "trash bag", "garbage bag", "dish soap", "detergent",
      "laundry", "cleaner", "cleaning", "sponge", "bleach", "wipes",
      "disinfect", "hand soap", "shampoo", "conditioner", "toothpaste",
      "toothbrush", "deodorant", "lotion", "sunscreen", "bandaid",
      "band-aid", "medicine", "vitamin", "batteries", "light bulb",
      "candle", "matches", "pet food", "dog food", "cat food", "cat litter",
      "ziplock", "freezer bag", "sandwich bag", "wax paper", "saran",
    ],
  ],
];

/** Infer a department from the item text. Ambiguous items go to Other. */
export function inferCategory(text: string): GroceryCategory {
  const t = ` ${text.toLowerCase()} `;
  // Strong signals first: "frozen …" beats the food word, and broth/stock is
  // a pantry staple even when it names a meat.
  if (t.includes("frozen")) return "frozen";
  if (/\b(broth|stock|bouillon)\b/.test(t)) return "pantry";
  for (const [cat, words] of KW) {
    for (const w of words) {
      if (t.includes(w)) return cat;
    }
  }
  return "other";
}

/** A user correction wins; otherwise infer from the text. */
export function categoryOf(item: GroceryItem): GroceryCategory {
  return item.category ?? inferCategory(item.text);
}
