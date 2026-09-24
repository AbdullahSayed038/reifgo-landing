// Every icon the CMS offers, with a plain name, so nobody has to know icon
// codes. The codes are what the app draws: "mci:…" is Material Community
// Icons, a bare name is Ionicons. Every code here was checked against the
// icon sets bundled in the app.

const mci = (list) => list.map(([code, label]) => ({ icon: `mci:${code}`, label }));

export const ICON_SETS = {
  amenities: mci([
    ["swim", "Swimming pool"], ["pool", "Pool"], ["hot-tub", "Jacuzzi"], ["spa-outline", "Spa"],
    ["dumbbell", "Gym"], ["yoga", "Yoga studio"], ["run", "Running track"], ["tennis", "Tennis court"],
    ["basketball", "Basketball court"], ["soccer", "Football pitch"], ["golf", "Golf"], ["bike", "Cycling"],
    ["billiards", "Games room"], ["gamepad-variant-outline", "Gaming lounge"], ["bowling", "Bowling"],
    ["movie-open-outline", "Cinema"], ["library", "Library"], ["laptop", "Co-working space"], ["desk", "Study"],
    ["seesaw", "Kids' play area"], ["baby-carriage", "Nursery"], ["human-male-female-child", "Family area"],
    ["grill-outline", "BBQ area"], ["table-chair", "Dining area"], ["tree-outline", "Garden"],
    ["flower-outline", "Landscaping"], ["beach", "Beach access"], ["paw", "Pet friendly"], ["dog", "Dog park"],
    ["parking", "Parking"], ["garage", "Covered parking"], ["car", "Valet"], ["ev-station", "EV charging"],
    ["elevator-passenger", "Lift"], ["shield-check-outline", "24/7 security"], ["cctv", "CCTV"],
    ["gate", "Gated community"], ["lock-outline", "Smart locks"], ["room-service-outline", "Concierge"],
    ["home-group", "Community"], ["office-building", "Tower"], ["balcony", "Balcony"],
    ["air-conditioner", "Air conditioning"], ["home-automation", "Smart home"], ["wifi", "Wi-Fi"],
    ["washing-machine", "Laundry"], ["stove", "Fitted kitchen"], ["countertop-outline", "Kitchen counters"],
    ["hanger", "Walk-in wardrobe"], ["wardrobe-outline", "Built-in wardrobes"], ["bed-outline", "Bedroom"],
    ["sofa-outline", "Furnished"], ["fireplace", "Fireplace"], ["bathtub-outline", "Bathtub"],
    ["shower-head", "Rain shower"], ["water-outline", "Water feature"], ["check-circle-outline", "Other"],
  ]),
  places: mci([
    ["shopping-outline", "Shopping mall"], ["store-outline", "Shops"], ["cart-outline", "Supermarket"],
    ["airplane-landing", "Airport"], ["airplane", "Flights"], ["train", "Train station"],
    ["subway-variant", "Metro"], ["tram", "Tram"], ["bus", "Bus stop"], ["highway", "Highway"],
    ["gas-station", "Petrol station"], ["pine-tree", "Park"], ["palm-tree", "Palm trees"], ["beach", "Beach"],
    ["island", "Island"], ["waves", "Waterfront"], ["sail-boat", "Marina"], ["anchor", "Port"],
    ["image-filter-hdr", "Mountains"], ["hiking", "Hiking trail"], ["golf", "Golf course"],
    ["school-outline", "School"], ["school", "University"], ["baby-carriage", "Nursery"],
    ["hospital-building", "Hospital"], ["hospital-box-outline", "Clinic"], ["medical-bag", "Pharmacy"],
    ["silverware-fork-knife", "Restaurants"], ["coffee-outline", "Cafés"], ["mosque", "Mosque"],
    ["church", "Church"], ["city-variant-outline", "City centre"], ["office-building-outline", "Business district"],
    ["bank", "Bank"], ["stadium", "Stadium"], ["ferris-wheel", "Theme park"], ["theater", "Theatre"],
    ["castle", "Landmark"], ["police-badge-outline", "Police station"], ["warehouse", "Industrial area"],
  ]),
  values: [
    // The Ionicons the seeded developer values already use.
    { icon: "leaf-outline", label: "Sustainability" },
    { icon: "people-outline", label: "People" },
    { icon: "globe-outline", label: "Global reach" },
    { icon: "earth-outline", label: "World" },
    { icon: "trending-up-outline", label: "Growth" },
    { icon: "analytics-outline", label: "Insight" },
    { icon: "home-outline", label: "Home" },
    { icon: "shield-checkmark-outline", label: "Trust" },
    { icon: "diamond-outline", label: "Quality" },
    { icon: "hammer-outline", label: "Craftsmanship" },
    ...mci([
      ["check-decagram-outline", "Verified"], ["math-compass", "Design"], ["handshake-outline", "Partnership"],
      ["lightbulb-on-outline", "Innovation"], ["trophy-outline", "Awards"], ["rocket-launch-outline", "Ambition"],
      ["medal-outline", "Excellence"], ["target", "Focus"], ["eye-outline", "Vision"], ["key-outline", "Ownership"],
      ["star-outline", "Premium"], ["heart-outline", "Care"], ["crane", "Construction"],
      ["city-variant-outline", "Communities"], ["account-tie-outline", "Service"], ["scale-balance", "Integrity"],
      ["cash-multiple", "Value"], ["recycle", "Recycling"], ["solar-power", "Clean energy"], ["sprout", "Green living"],
    ]),
  ],
};

const LABELS = new Map(Object.values(ICON_SETS).flat().map((o) => [o.icon, o.label]));

/** The plain name for an icon code, or null if it isn't one of ours. */
export const iconLabel = (code) => (code ? LABELS.get(code.trim()) ?? null : null);
