/* FourFold V4 original curated connection bank. Every entry has four verifiable answers.
   Each group is available to every new puzzle, without level-based restrictions.
   Add new groups by appending { id, type, name, words } records below.
*/
(function(root){
 'use strict';
 const groups=[
 {
  "id": "g001",
  "type": "category",
  "name": "CHESS PIECES",
  "words": [
   "KING",
   "QUEEN",
   "ROOK",
   "BISHOP"
  ]
 },
 {
  "id": "g002",
  "type": "category",
  "name": "CARD SUITS",
  "words": [
   "HEARTS",
   "CLUBS",
   "SPADES",
   "DIAMONDS"
  ]
 },
 {
  "id": "g003",
  "type": "category",
  "name": "CARD RANKS",
  "words": [
   "ACE",
   "KING",
   "QUEEN",
   "JACK"
  ]
 },
 {
  "id": "g004",
  "type": "category",
  "name": "GEMSTONES",
  "words": [
   "RUBY",
   "SAPPHIRE",
   "OPAL",
   "EMERALD"
  ]
 },
 {
  "id": "g005",
  "type": "category",
  "name": "PRECIOUS METALS",
  "words": [
   "GOLD",
   "SILVER",
   "PLATINUM",
   "PALLADIUM"
  ]
 },
 {
  "id": "g006",
  "type": "category",
  "name": "NOBLE GASES",
  "words": [
   "HELIUM",
   "NEON",
   "ARGON",
   "KRYPTON"
  ]
 },
 {
  "id": "g007",
  "type": "category",
  "name": "TREES",
  "words": [
   "OAK",
   "BIRCH",
   "WILLOW",
   "MAPLE"
  ]
 },
 {
  "id": "g008",
  "type": "category",
  "name": "GARDEN FLOWERS",
  "words": [
   "TULIP",
   "DAISY",
   "IRIS",
   "DAFFODIL"
  ]
 },
 {
  "id": "g009",
  "type": "category",
  "name": "CULINARY HERBS",
  "words": [
   "BASIL",
   "THYME",
   "SAGE",
   "ROSEMARY"
  ]
 },
 {
  "id": "g010",
  "type": "category",
  "name": "SPICES",
  "words": [
   "CUMIN",
   "PAPRIKA",
   "CLOVES",
   "SAFFRON"
  ]
 },
 {
  "id": "g011",
  "type": "category",
  "name": "CITRUS FRUITS",
  "words": [
   "LEMON",
   "LIME",
   "ORANGE",
   "GRAPEFRUIT"
  ]
 },
 {
  "id": "g012",
  "type": "category",
  "name": "TROPICAL FRUITS",
  "words": [
   "MANGO",
   "PAPAYA",
   "GUAVA",
   "LYCHEE"
  ]
 },
 {
  "id": "g013",
  "type": "category",
  "name": "EDIBLE NUTS",
  "words": [
   "ALMOND",
   "WALNUT",
   "PECAN",
   "CASHEW"
  ]
 },
 {
  "id": "g014",
  "type": "category",
  "name": "PASTA SHAPES",
  "words": [
   "PENNE",
   "FUSILLI",
   "FARFALLE",
   "RIGATONI"
  ]
 },
 {
  "id": "g015",
  "type": "category",
  "name": "CHEESES",
  "words": [
   "BRIE",
   "FETA",
   "GOUDA",
   "CHEDDAR"
  ]
 },
 {
  "id": "g016",
  "type": "category",
  "name": "BREADS",
  "words": [
   "PITA",
   "NAAN",
   "BAGEL",
   "BAGUETTE"
  ]
 },
 {
  "id": "g017",
  "type": "category",
  "name": "COOKING METHODS",
  "words": [
   "ROAST",
   "STEAM",
   "POACH",
   "GRILL"
  ]
 },
 {
  "id": "g018",
  "type": "category",
  "name": "TYPES OF TEA",
  "words": [
   "GREEN",
   "BLACK",
   "WHITE",
   "OOLONG"
  ]
 },
 {
  "id": "g019",
  "type": "category",
  "name": "COFFEE DRINKS",
  "words": [
   "LATTE",
   "MOCHA",
   "ESPRESSO",
   "CAPPUCCINO"
  ]
 },
 {
  "id": "g020",
  "type": "category",
  "name": "STRING INSTRUMENTS",
  "words": [
   "VIOLIN",
   "VIOLA",
   "CELLO",
   "HARP"
  ]
 },
 {
  "id": "g021",
  "type": "category",
  "name": "WOODWIND INSTRUMENTS",
  "words": [
   "FLUTE",
   "OBOE",
   "CLARINET",
   "BASSOON"
  ]
 },
 {
  "id": "g022",
  "type": "category",
  "name": "PERCUSSION INSTRUMENTS",
  "words": [
   "GONG",
   "BONGO",
   "CYMBAL",
   "TAMBOURINE"
  ]
 },
 {
  "id": "g023",
  "type": "category",
  "name": "BALLROOM AND LATIN DANCES",
  "words": [
   "TANGO",
   "WALTZ",
   "SALSA",
   "RUMBA"
  ]
 },
 {
  "id": "g024",
  "type": "category",
  "name": "MUSICAL TEMPOS",
  "words": [
   "LARGO",
   "ANDANTE",
   "ALLEGRO",
   "PRESTO"
  ]
 },
 {
  "id": "g025",
  "type": "category",
  "name": "MUSIC GENRES",
  "words": [
   "JAZZ",
   "BLUES",
   "PUNK",
   "FOLK"
  ]
 },
 {
  "id": "g026",
  "type": "category",
  "name": "TEAM SPORTS",
  "words": [
   "RUGBY",
   "HOCKEY",
   "FOOTBALL",
   "CRICKET"
  ]
 },
 {
  "id": "g027",
  "type": "category",
  "name": "ATHLETICS EVENTS",
  "words": [
   "JAVELIN",
   "DISCUS",
   "HURDLES",
   "MARATHON"
  ]
 },
 {
  "id": "g028",
  "type": "category",
  "name": "SWIMMING STROKES",
  "words": [
   "FREESTYLE",
   "BUTTERFLY",
   "BACKSTROKE",
   "BREASTSTROKE"
  ]
 },
 {
  "id": "g029",
  "type": "category",
  "name": "BOARD GAMES",
  "words": [
   "SCRABBLE",
   "CLUEDO",
   "MONOPOLY",
   "RISK"
  ]
 },
 {
  "id": "g030",
  "type": "category",
  "name": "PUZZLE TYPES",
  "words": [
   "CROSSWORD",
   "SUDOKU",
   "JIGSAW",
   "MAZE"
  ]
 },
 {
  "id": "g031",
  "type": "category",
  "name": "HAND TOOLS",
  "words": [
   "HAMMER",
   "PLIERS",
   "CHISEL",
   "SPANNER"
  ]
 },
 {
  "id": "g032",
  "type": "category",
  "name": "WOODWORKING JOINTS",
  "words": [
   "DOVETAIL",
   "MORTISE",
   "TENON",
   "DOWEL"
  ]
 },
 {
  "id": "g033",
  "type": "category",
  "name": "FASTENERS",
  "words": [
   "BOLT",
   "SCREW",
   "NAIL",
   "RIVET"
  ]
 },
 {
  "id": "g034",
  "type": "category",
  "name": "SEWING SUPPLIES",
  "words": [
   "NEEDLE",
   "THIMBLE",
   "THREAD",
   "SCISSORS"
  ]
 },
 {
  "id": "g035",
  "type": "category",
  "name": "FABRICS",
  "words": [
   "DENIM",
   "LINEN",
   "VELVET",
   "SILK"
  ]
 },
 {
  "id": "g036",
  "type": "category",
  "name": "SHOE STYLES",
  "words": [
   "LOAFER",
   "BROGUE",
   "SANDAL",
   "TRAINER"
  ]
 },
 {
  "id": "g037",
  "type": "category",
  "name": "HAT STYLES",
  "words": [
   "FEDORA",
   "BERET",
   "BOWLER",
   "BEANIE"
  ]
 },
 {
  "id": "g038",
  "type": "category",
  "name": "ROOMS IN A HOUSE",
  "words": [
   "ATTIC",
   "CELLAR",
   "PANTRY",
   "KITCHEN"
  ]
 },
 {
  "id": "g039",
  "type": "category",
  "name": "ARCHITECTURAL STYLES",
  "words": [
   "GOTHIC",
   "BAROQUE",
   "BRUTALIST",
   "ROMANESQUE"
  ]
 },
 {
  "id": "g040",
  "type": "category",
  "name": "ROAD TYPES",
  "words": [
   "AVENUE",
   "BOULEVARD",
   "LANE",
   "CRESCENT"
  ]
 },
 {
  "id": "g041",
  "type": "category",
  "name": "PARTS OF A SHIP",
  "words": [
   "BOW",
   "STERN",
   "KEEL",
   "MAST"
  ]
 },
 {
  "id": "g042",
  "type": "category",
  "name": "SMALL BOATS",
  "words": [
   "CANOE",
   "KAYAK",
   "DINGHY",
   "GONDOLA"
  ]
 },
 {
  "id": "g043",
  "type": "category",
  "name": "TYPES OF AIRCRAFT",
  "words": [
   "GLIDER",
   "BIPLANE",
   "HELICOPTER",
   "JET"
  ]
 },
 {
  "id": "g044",
  "type": "category",
  "name": "RAILWAY FEATURES",
  "words": [
   "PLATFORM",
   "TRACK",
   "SIGNAL",
   "CARRIAGE"
  ]
 },
 {
  "id": "g045",
  "type": "category",
  "name": "CARDINAL DIRECTIONS",
  "words": [
   "NORTH",
   "SOUTH",
   "EAST",
   "WEST"
  ]
 },
 {
  "id": "g046",
  "type": "category",
  "name": "TIME UNITS",
  "words": [
   "SECOND",
   "MINUTE",
   "HOUR",
   "DAY"
  ]
 },
 {
  "id": "g047",
  "type": "category",
  "name": "SEASONS",
  "words": [
   "SPRING",
   "SUMMER",
   "AUTUMN",
   "WINTER"
  ]
 },
 {
  "id": "g048",
  "type": "category",
  "name": "WEEKDAYS",
  "words": [
   "MONDAY",
   "TUESDAY",
   "FRIDAY",
   "SUNDAY"
  ]
 },
 {
  "id": "g049",
  "type": "category",
  "name": "MONTHS OF THE YEAR",
  "words": [
   "APRIL",
   "JUNE",
   "SEPTEMBER",
   "NOVEMBER"
  ]
 },
 {
  "id": "g050",
  "type": "category",
  "name": "CURRENCIES",
  "words": [
   "EURO",
   "DOLLAR",
   "YEN",
   "RUPEE"
  ]
 },
 {
  "id": "g051",
  "type": "category",
  "name": "HUMAN BONES",
  "words": [
   "FEMUR",
   "TIBIA",
   "RADIUS",
   "ULNA"
  ]
 },
 {
  "id": "g052",
  "type": "category",
  "name": "SENSE ORGANS",
  "words": [
   "EYE",
   "EAR",
   "NOSE",
   "TONGUE"
  ]
 },
 {
  "id": "g053",
  "type": "category",
  "name": "JOINTS",
  "words": [
   "ELBOW",
   "WRIST",
   "ANKLE",
   "KNEE"
  ]
 },
 {
  "id": "g054",
  "type": "category",
  "name": "WOODLAND MAMMALS",
  "words": [
   "OTTER",
   "BADGER",
   "FOX",
   "HEDGEHOG"
  ]
 },
 {
  "id": "g055",
  "type": "category",
  "name": "BIG CATS",
  "words": [
   "LION",
   "TIGER",
   "LEOPARD",
   "JAGUAR"
  ]
 },
 {
  "id": "g056",
  "type": "category",
  "name": "MARINE MAMMALS",
  "words": [
   "WHALE",
   "DOLPHIN",
   "SEAL",
   "PORPOISE"
  ]
 },
 {
  "id": "g057",
  "type": "category",
  "name": "INSECTS",
  "words": [
   "BEETLE",
   "ANT",
   "MOTH",
   "WASP"
  ]
 },
 {
  "id": "g058",
  "type": "category",
  "name": "GARDEN BIRDS",
  "words": [
   "ROBIN",
   "SPARROW",
   "MAGPIE",
   "STARLING"
  ]
 },
 {
  "id": "g059",
  "type": "category",
  "name": "DOG BREEDS",
  "words": [
   "BEAGLE",
   "POODLE",
   "COLLIE",
   "DALMATIAN"
  ]
 },
 {
  "id": "g060",
  "type": "category",
  "name": "HORSE GAITS",
  "words": [
   "WALK",
   "TROT",
   "CANTER",
   "GALLOP"
  ]
 },
 {
  "id": "g061",
  "type": "category",
  "name": "EDIBLE FISH",
  "words": [
   "SALMON",
   "TROUT",
   "COD",
   "HADDOCK"
  ]
 },
 {
  "id": "g062",
  "type": "category",
  "name": "REPTILES",
  "words": [
   "IGUANA",
   "GECKO",
   "COBRA",
   "PYTHON"
  ]
 },
 {
  "id": "g063",
  "type": "category",
  "name": "KITCHEN UTENSILS",
  "words": [
   "LADLE",
   "WHISK",
   "SPATULA",
   "TONGS"
  ]
 },
 {
  "id": "g064",
  "type": "category",
  "name": "SCHOOL SUBJECTS",
  "words": [
   "HISTORY",
   "MATHS",
   "CHEMISTRY",
   "GEOGRAPHY"
  ]
 },
 {
  "id": "g065",
  "type": "category",
  "name": "PUNCTUATION MARKS",
  "words": [
   "COMMA",
   "COLON",
   "HYPHEN",
   "APOSTROPHE"
  ]
 },
 {
  "id": "g066",
  "type": "category",
  "name": "GREEK LETTERS",
  "words": [
   "ALPHA",
   "BETA",
   "GAMMA",
   "DELTA"
  ]
 },
 {
  "id": "g067",
  "type": "category",
  "name": "GEOMETRIC SHAPES",
  "words": [
   "TRIANGLE",
   "CIRCLE",
   "SQUARE",
   "PENTAGON"
  ]
 },
 {
  "id": "g068",
  "type": "category",
  "name": "CIRCLE GEOMETRY",
  "words": [
   "RADIUS",
   "DIAMETER",
   "CHORD",
   "TANGENT"
  ]
 },
 {
  "id": "g069",
  "type": "category",
  "name": "WEATHER CONDITIONS",
  "words": [
   "FOG",
   "HAIL",
   "SLEET",
   "DRIZZLE"
  ]
 },
 {
  "id": "g070",
  "type": "category",
  "name": "TYPES OF CLOUD",
  "words": [
   "CIRRUS",
   "CUMULUS",
   "STRATUS",
   "ALTOSTRATUS"
  ]
 },
 {
  "id": "g071",
  "type": "category",
  "name": "BODIES OF WATER",
  "words": [
   "LAGOON",
   "ESTUARY",
   "GULF",
   "BAY"
  ]
 },
 {
  "id": "g072",
  "type": "category",
  "name": "WOOD TYPES",
  "words": [
   "ASH",
   "TEAK",
   "PINE",
   "OAK"
  ]
 },
 {
  "id": "g073",
  "type": "category",
  "name": "HANDHELD CONTAINERS",
  "words": [
   "BUCKET",
   "BASKET",
   "JUG",
   "FLASK"
  ]
 },
 {
  "id": "g074",
  "type": "category",
  "name": "TOOLS FOR GARDENING",
  "words": [
   "RAKE",
   "HOE",
   "SPADE",
   "TROWEL"
  ]
 },
 {
  "id": "g075",
  "type": "category",
  "name": "GARDEN VEGETABLES",
  "words": [
   "CARROT",
   "ONION",
   "LEEK",
   "PARSNIP"
  ]
 },
 {
  "id": "g076",
  "type": "category",
  "name": "LEAFY GREENS",
  "words": [
   "KALE",
   "SPINACH",
   "LETTUCE",
   "CHARD"
  ]
 },
 {
  "id": "g077",
  "type": "category",
  "name": "WILD FUNGI",
  "words": [
   "MOREL",
   "CHANTERELLE",
   "BOLETE",
   "TRUFFLE"
  ]
 },
 {
  "id": "g078",
  "type": "category",
  "name": "ICE CREAM FLAVOURS",
  "words": [
   "VANILLA",
   "CHOCOLATE",
   "STRAWBERRY",
   "PISTACHIO"
  ]
 },
 {
  "id": "g079",
  "type": "category",
  "name": "HAIR STYLES",
  "words": [
   "BOB",
   "PIXIE",
   "MULLET",
   "MOHAWK"
  ]
 },
 {
  "id": "g080",
  "type": "category",
  "name": "JEWELLERY",
  "words": [
   "RING",
   "BROOCH",
   "PENDANT",
   "BANGLE"
  ]
 },
 {
  "id": "g081",
  "type": "category",
  "name": "SCHOOL STATIONERY",
  "words": [
   "ERASER",
   "RULER",
   "PENCIL",
   "HIGHLIGHTER"
  ]
 },
 {
  "id": "g082",
  "type": "category",
  "name": "CAR PARTS",
  "words": [
   "BONNET",
   "CLUTCH",
   "RADIATOR",
   "GEARBOX"
  ]
 },
 {
  "id": "g083",
  "type": "category",
  "name": "AIRPORT FEATURES",
  "words": [
   "RUNWAY",
   "TERMINAL",
   "HANGAR",
   "TAXIWAY"
  ]
 },
 {
  "id": "g084",
  "type": "category",
  "name": "FARM ANIMALS",
  "words": [
   "SHEEP",
   "GOAT",
   "PIG",
   "COW"
  ]
 },
 {
  "id": "g085",
  "type": "category",
  "name": "BIRDS OF PREY",
  "words": [
   "HAWK",
   "EAGLE",
   "FALCON",
   "OSPREY"
  ]
 },
 {
  "id": "g086",
  "type": "category",
  "name": "CHEMISTRY LAB EQUIPMENT",
  "words": [
   "BEAKER",
   "FLASK",
   "BURETTE",
   "PIPETTE"
  ]
 },
 {
  "id": "g087",
  "type": "category",
  "name": "FLOWER PARTS",
  "words": [
   "PETAL",
   "STAMEN",
   "SEPAL",
   "PISTIL"
  ]
 },
 {
  "id": "g088",
  "type": "category",
  "name": "TYPES OF TRIANGLE",
  "words": [
   "SCALENE",
   "ISOSCELES",
   "EQUILATERAL",
   "RIGHT"
  ]
 },
 {
  "id": "g089",
  "type": "category",
  "name": "COMPUTER PERIPHERALS",
  "words": [
   "KEYBOARD",
   "MOUSE",
   "PRINTER",
   "SCANNER"
  ]
 },
 {
  "id": "g090",
  "type": "category",
  "name": "ONLINE SERVICES",
  "words": [
   "EMAIL",
   "SEARCH",
   "STREAMING",
   "MESSAGING"
  ]
 },
 {
  "id": "g091",
  "type": "category",
  "name": "TYPES OF BRIDGE",
  "words": [
   "ARCH",
   "BEAM",
   "TRUSS",
   "SUSPENSION"
  ]
 },
 {
  "id": "g092",
  "type": "category",
  "name": "FURNITURE",
  "words": [
   "SOFA",
   "TABLE",
   "DESK",
   "WARDROBE"
  ]
 },
 {
  "id": "g093",
  "type": "category",
  "name": "TYPES OF FENCE",
  "words": [
   "PICKET",
   "PANEL",
   "PALISADE",
   "HURDLE"
  ]
 },
 {
  "id": "g094",
  "type": "category",
  "name": "FOUR TRADITIONAL TASTES",
  "words": [
   "SWEET",
   "SOUR",
   "SALTY",
   "BITTER"
  ]
 },
 {
  "id": "g095",
  "type": "category",
  "name": "DINNER COURSES",
  "words": [
   "STARTER",
   "MAIN",
   "DESSERT",
   "CHEESE"
  ]
 },
 {
  "id": "g096",
  "type": "category",
  "name": "TYPES OF CLOTHING FASTENER",
  "words": [
   "ZIP",
   "BUTTON",
   "BUCKLE",
   "VELCRO"
  ]
 },
 {
  "id": "g097",
  "type": "phrase",
  "name": "THINGS YOU CAN BREAK",
  "words": [
   "PROMISE",
   "SILENCE",
   "RECORD",
   "HABIT"
  ]
 },
 {
  "id": "g098",
  "type": "phrase",
  "name": "THINGS YOU CAN DRAW",
  "words": [
   "BATH",
   "CURTAIN",
   "CARD",
   "SWORD"
  ]
 },
 {
  "id": "g099",
  "type": "phrase",
  "name": "THINGS YOU CAN RUN",
  "words": [
   "BUSINESS",
   "MARATHON",
   "BATH",
   "ERRAND"
  ]
 },
 {
  "id": "g100",
  "type": "phrase",
  "name": "THINGS YOU CAN CATCH",
  "words": [
   "COLD",
   "TRAIN",
   "BALL",
   "FLIGHT"
  ]
 },
 {
  "id": "g101",
  "type": "phrase",
  "name": "THINGS YOU CAN TAKE",
  "words": [
   "PHOTO",
   "BREAK",
   "SEAT",
   "CHANCE"
  ]
 },
 {
  "id": "g102",
  "type": "phrase",
  "name": "THINGS YOU CAN HOLD",
  "words": [
   "BREATH",
   "GRUDGE",
   "HAND",
   "COURT"
  ]
 },
 {
  "id": "g103",
  "type": "phrase",
  "name": "THINGS YOU CAN MAKE",
  "words": [
   "BED",
   "DEAL",
   "AMENDS",
   "NOISE"
  ]
 },
 {
  "id": "g104",
  "type": "phrase",
  "name": "THINGS YOU CAN LOSE",
  "words": [
   "TEMPER",
   "KEYS",
   "WEIGHT",
   "SIGHT"
  ]
 },
 {
  "id": "g105",
  "type": "phrase",
  "name": "THINGS YOU CAN RAISE",
  "words": [
   "EYEBROW",
   "FLAG",
   "MONEY",
   "QUESTION"
  ]
 },
 {
  "id": "g106",
  "type": "phrase",
  "name": "THINGS YOU CAN SPILL",
  "words": [
   "BEANS",
   "TEA",
   "INK",
   "SECRET"
  ]
 },
 {
  "id": "g107",
  "type": "phrase",
  "name": "THINGS YOU CAN MISS",
  "words": [
   "BUS",
   "TARGET",
   "POINT",
   "CHANCE"
  ]
 },
 {
  "id": "g108",
  "type": "phrase",
  "name": "THINGS YOU CAN KEEP",
  "words": [
   "SECRET",
   "PROMISE",
   "PACE",
   "CHANGE"
  ]
 },
 {
  "id": "g109",
  "type": "phrase",
  "name": "THINGS YOU CAN PASS",
  "words": [
   "EXAM",
   "BALL",
   "BATON",
   "JUDGEMENT"
  ]
 },
 {
  "id": "g110",
  "type": "phrase",
  "name": "THINGS YOU CAN DROP",
  "words": [
   "HINT",
   "NAME",
   "ANCHOR",
   "BALL"
  ]
 },
 {
  "id": "g111",
  "type": "phrase",
  "name": "THINGS YOU CAN PICK",
  "words": [
   "POCKET",
   "LOCK",
   "FIGHT",
   "FLOWERS"
  ]
 },
 {
  "id": "g112",
  "type": "phrase",
  "name": "THINGS YOU CAN TURN",
  "words": [
   "CORNER",
   "PAGE",
   "TABLE",
   "TIDE"
  ]
 },
 {
  "id": "g113",
  "type": "phrase",
  "name": "THINGS YOU CAN STRIKE",
  "words": [
   "MATCH",
   "DEAL",
   "POSE",
   "BALANCE"
  ]
 },
 {
  "id": "g114",
  "type": "phrase",
  "name": "THINGS YOU CAN GIVE",
  "words": [
   "SPEECH",
   "GIFT",
   "WARNING",
   "ANSWER"
  ]
 },
 {
  "id": "g115",
  "type": "phrase",
  "name": "THINGS YOU CAN CUT",
  "words": [
   "CAKE",
   "CORNER",
   "DECK",
   "COSTS"
  ]
 },
 {
  "id": "g116",
  "type": "phrase",
  "name": "THINGS YOU CAN PLAY",
  "words": [
   "GAME",
   "ROLE",
   "INSTRUMENT",
   "TRICK"
  ]
 },
 {
  "id": "g117",
  "type": "phrase",
  "name": "THINGS YOU CAN SET",
  "words": [
   "TABLE",
   "ALARM",
   "RECORD",
   "TRAP"
  ]
 },
 {
  "id": "g118",
  "type": "phrase",
  "name": "THINGS YOU CAN OPEN",
  "words": [
   "ACCOUNT",
   "DOOR",
   "MIND",
   "LETTER"
  ]
 },
 {
  "id": "g119",
  "type": "phrase",
  "name": "THINGS YOU CAN CLOSE",
  "words": [
   "DEAL",
   "EYES",
   "SHOP",
   "CASE"
  ]
 },
 {
  "id": "g120",
  "type": "phrase",
  "name": "THINGS YOU CAN SEND",
  "words": [
   "MESSAGE",
   "PARCEL",
   "SIGNAL",
   "INVOICE"
  ]
 },
 {
  "id": "g121",
  "type": "phrase",
  "name": "THINGS YOU CAN LEAD",
  "words": [
   "TEAM",
   "HORSE",
   "DANCE",
   "LIFE"
  ]
 },
 {
  "id": "g122",
  "type": "phrase",
  "name": "THINGS YOU CAN FOLLOW",
  "words": [
   "TRAIL",
   "RULES",
   "RECIPE",
   "LEADER"
  ]
 },
 {
  "id": "g123",
  "type": "phrase",
  "name": "THINGS YOU CAN CHANGE",
  "words": [
   "MIND",
   "CLOTHES",
   "CHANNEL",
   "COURSE"
  ]
 },
 {
  "id": "g124",
  "type": "phrase",
  "name": "THINGS YOU CAN SHAKE",
  "words": [
   "HAND",
   "COCKTAIL",
   "TREE",
   "HEAD"
  ]
 },
 {
  "id": "g125",
  "type": "phrase",
  "name": "THINGS YOU CAN CAST",
  "words": [
   "SHADOW",
   "VOTE",
   "SPELL",
   "NET"
  ]
 },
 {
  "id": "g126",
  "type": "phrase",
  "name": "THINGS YOU CAN WEAR",
  "words": [
   "HAT",
   "SMILE",
   "BADGE",
   "PERFUME"
  ]
 },
 {
  "id": "g127",
  "type": "phrase",
  "name": "THINGS YOU CAN LIFT",
  "words": [
   "SPIRITS",
   "WEIGHTS",
   "FINGER",
   "BAN"
  ]
 },
 {
  "id": "g128",
  "type": "phrase",
  "name": "THINGS THAT CAN FALL",
  "words": [
   "NIGHT",
   "RAIN",
   "LEAVES",
   "DOMINOES"
  ]
 },
 {
  "id": "g129",
  "type": "phrase",
  "name": "THINGS THAT CAN RUN",
  "words": [
   "CLOCK",
   "ENGINE",
   "TAP",
   "PROGRAM"
  ]
 },
 {
  "id": "g130",
  "type": "phrase",
  "name": "THINGS THAT CAN FLY",
  "words": [
   "KITE",
   "PLANE",
   "FLAG",
   "RUMOUR"
  ]
 },
 {
  "id": "g131",
  "type": "phrase",
  "name": "THINGS THAT CAN CRACK",
  "words": [
   "GLASS",
   "ICE",
   "VOICE",
   "EGG"
  ]
 },
 {
  "id": "g132",
  "type": "spelling",
  "name": "PALINDROMES",
  "words": [
   "LEVEL",
   "RADAR",
   "CIVIC",
   "KAYAK"
  ]
 },
 {
  "id": "g133",
  "type": "spelling",
  "name": "SILENT FIRST LETTER",
  "words": [
   "KNIFE",
   "WRIST",
   "GNOME",
   "PSALM"
  ]
 },
 {
  "id": "g134",
  "type": "spelling",
  "name": "WORDS WITH SILENT B",
  "words": [
   "LAMB",
   "THUMB",
   "COMB",
   "DEBT"
  ]
 },
 {
  "id": "g135",
  "type": "spelling",
  "name": "WORDS WITH SILENT K",
  "words": [
   "KNIFE",
   "KNEE",
   "KNOW",
   "KNOCK"
  ]
 },
 {
  "id": "g136",
  "type": "spelling",
  "name": "WORDS WITH SILENT W",
  "words": [
   "WRIST",
   "WRAP",
   "WRONG",
   "WRECK"
  ]
 },
 {
  "id": "g137",
  "type": "spelling",
  "name": "WORDS WITH SILENT GH",
  "words": [
   "NIGHT",
   "LIGHT",
   "THOUGH",
   "BOUGHT"
  ]
 },
 {
  "id": "g138",
  "type": "spelling",
  "name": "WORDS WITH DOUBLE O",
  "words": [
   "BOOK",
   "MOON",
   "BOOT",
   "WOOD"
  ]
 },
 {
  "id": "g139",
  "type": "spelling",
  "name": "WORDS WITH DOUBLE E",
  "words": [
   "GREEN",
   "CHEESE",
   "FREEZE",
   "SLEEP"
  ]
 },
 {
  "id": "g140",
  "type": "spelling",
  "name": "WORDS ENDING IN TION",
  "words": [
   "ACTION",
   "STATION",
   "MOTION",
   "POTION"
  ]
 },
 {
  "id": "g141",
  "type": "spelling",
  "name": "WORDS STARTING WITH TRI",
  "words": [
   "TRICYCLE",
   "TRIANGLE",
   "TRIPOD",
   "TRILOGY"
  ]
 },
 {
  "id": "g142",
  "type": "spelling",
  "name": "WORDS CONTAINING CAT",
  "words": [
   "CATALOG",
   "CATERPILLAR",
   "CATFISH",
   "WILDCAT"
  ]
 },
 {
  "id": "g143",
  "type": "spelling",
  "name": "WORDS CONTAINING STAR",
  "words": [
   "STARFISH",
   "STARDUST",
   "STARLIGHT",
   "ROCKSTAR"
  ]
 },
 {
  "id": "g144",
  "type": "spelling",
  "name": "WORDS CONTAINING SUN",
  "words": [
   "SUNRISE",
   "SUNSET",
   "SUNFLOWER",
   "SUNSHINE"
  ]
 },
 {
  "id": "g145",
  "type": "spelling",
  "name": "WORDS CONTAINING LIGHT",
  "words": [
   "MOONLIGHT",
   "SUNLIGHT",
   "DAYLIGHT",
   "HIGHLIGHT"
  ]
 },
 {
  "id": "g146",
  "type": "spelling",
  "name": "BRITISH SPELLINGS",
  "words": [
   "COLOUR",
   "FAVOUR",
   "CENTRE",
   "THEATRE"
  ]
 },
 {
  "id": "g147",
  "type": "spelling",
  "name": "WORDS CONTAINING IE",
  "words": [
   "BELIEVE",
   "FRIEND",
   "FIELD",
   "PIECE"
  ]
 },
 {
  "id": "g148",
  "type": "spelling",
  "name": "WORDS CONTAINING EI",
  "words": [
   "CEILING",
   "RECEIVE",
   "DECEIVE",
   "SEIZE"
  ]
 },
 {
  "id": "g149",
  "type": "spelling",
  "name": "WORDS ENDING IN MENT",
  "words": [
   "MOMENT",
   "COMMENT",
   "MOVEMENT",
   "AGREEMENT"
  ]
 },
 {
  "id": "g150",
  "type": "spelling",
  "name": "WORDS STARTING WITH UN",
  "words": [
   "UNFAIR",
   "UNHAPPY",
   "UNKNOWN",
   "UNABLE"
  ]
 },
 {
  "id": "g151",
  "type": "spelling",
  "name": "WORDS ENDING IN LY",
  "words": [
   "QUICKLY",
   "SLOWLY",
   "SOFTLY",
   "LOUDLY"
  ]
 },
 {
  "id": "g152",
  "type": "spelling",
  "name": "FOUR DIFFERENT OUGH SOUNDS",
  "words": [
   "THOUGH",
   "THROUGH",
   "BOUGH",
   "TOUGH"
  ]
 },
 {
  "id": "g153",
  "type": "spelling",
  "name": "WORDS WITH DOUBLE L",
  "words": [
   "HELLO",
   "YELLOW",
   "BELLOWS",
   "BALLOON"
  ]
 },
 {
  "id": "g154",
  "type": "spelling",
  "name": "WORDS WITH DOUBLE S",
  "words": [
   "LESSON",
   "HISSY",
   "PASSAGE",
   "GLOSSY"
  ]
 },
 {
  "id": "g155",
  "type": "spelling",
  "name": "WORDS ENDING IN ABLE",
  "words": [
   "CAPABLE",
   "READABLE",
   "LOVABLE",
   "REASONABLE"
  ]
 },
 {
  "id": "g156",
  "type": "compound",
  "name": "___LIGHT",
  "words": [
   "DAY",
   "MOON",
   "SPOT",
   "FLASH"
  ]
 },
 {
  "id": "g157",
  "type": "compound",
  "name": "___ROOM",
  "words": [
   "CLASS",
   "BALL",
   "BED",
   "COURT"
  ]
 },
 {
  "id": "g158",
  "type": "compound",
  "name": "___LINE",
  "words": [
   "DEAD",
   "PUNCH",
   "FINISH",
   "COAST"
  ]
 },
 {
  "id": "g159",
  "type": "compound",
  "name": "___BOARD",
  "words": [
   "KEY",
   "SCORE",
   "CHESS",
   "DART"
  ]
 },
 {
  "id": "g160",
  "type": "compound",
  "name": "___HOUSE",
  "words": [
   "GREEN",
   "WARE",
   "LIGHT",
   "CLUB"
  ]
 },
 {
  "id": "g161",
  "type": "compound",
  "name": "___DROP",
  "words": [
   "RAIN",
   "TEAR",
   "BACK",
   "EYE"
  ]
 },
 {
  "id": "g162",
  "type": "compound",
  "name": "___PRINT",
  "words": [
   "BLUE",
   "FINGER",
   "FOOT",
   "FINE"
  ]
 },
 {
  "id": "g163",
  "type": "compound",
  "name": "___WORK",
  "words": [
   "HOME",
   "FIELD",
   "PAPER",
   "NET"
  ]
 },
 {
  "id": "g164",
  "type": "compound",
  "name": "___FALL",
  "words": [
   "WATER",
   "NIGHT",
   "SNOW",
   "FREE"
  ]
 },
 {
  "id": "g165",
  "type": "compound",
  "name": "___BOOK",
  "words": [
   "NOTE",
   "TEXT",
   "COOK",
   "SCRAP"
  ]
 },
 {
  "id": "g166",
  "type": "compound",
  "name": "___MARK",
  "words": [
   "TRADE",
   "QUESTION",
   "CHECK",
   "BENCH"
  ]
 },
 {
  "id": "g167",
  "type": "compound",
  "name": "___SIDE",
  "words": [
   "ROAD",
   "SEA",
   "BED",
   "HILL"
  ]
 },
 {
  "id": "g168",
  "type": "compound",
  "name": "___BIRD",
  "words": [
   "BLUE",
   "BLACK",
   "HUMMING",
   "MOCKING"
  ]
 },
 {
  "id": "g169",
  "type": "compound",
  "name": "___TIME",
  "words": [
   "DAY",
   "NIGHT",
   "BED",
   "OVER"
  ]
 },
 {
  "id": "g170",
  "type": "compound",
  "name": "___STORM",
  "words": [
   "SNOW",
   "RAIN",
   "SAND",
   "FIRE"
  ]
 },
 {
  "id": "g171",
  "type": "compound",
  "name": "___BALL",
  "words": [
   "FOOT",
   "BASE",
   "BASKET",
   "SNOW"
  ]
 },
 {
  "id": "g172",
  "type": "compound",
  "name": "___CAKE",
  "words": [
   "PAN",
   "CUP",
   "CHEESE",
   "CARROT"
  ]
 },
 {
  "id": "g173",
  "type": "compound",
  "name": "___STONE",
  "words": [
   "LIME",
   "SAND",
   "MILE",
   "KEY"
  ]
 },
 {
  "id": "g174",
  "type": "compound",
  "name": "___COAT",
  "words": [
   "RAIN",
   "TRENCH",
   "OVER",
   "TOP"
  ]
 },
 {
  "id": "g175",
  "type": "compound",
  "name": "___DOG",
  "words": [
   "BULL",
   "SHEEP",
   "WATCH",
   "LAP"
  ]
 },
 {
  "id": "g176",
  "type": "compound",
  "name": "BLUE___",
  "words": [
   "BELL",
   "PRINT",
   "BERRY",
   "BIRD"
  ]
 },
 {
  "id": "g177",
  "type": "compound",
  "name": "BLACK___",
  "words": [
   "BOARD",
   "BERRY",
   "JACK",
   "SMITH"
  ]
 },
 {
  "id": "g178",
  "type": "compound",
  "name": "HEAD___",
  "words": [
   "BAND",
   "LINE",
   "LIGHT",
   "STONE"
  ]
 },
 {
  "id": "g179",
  "type": "compound",
  "name": "FOOT___",
  "words": [
   "BALL",
   "PRINT",
   "NOTE",
   "PATH"
  ]
 },
 {
  "id": "g180",
  "type": "compound",
  "name": "BOOK___",
  "words": [
   "CASE",
   "MARK",
   "SHELF",
   "WORM"
  ]
 },
 {
  "id": "g181",
  "type": "compound",
  "name": "SUN___",
  "words": [
   "FLOWER",
   "LIGHT",
   "RISE",
   "SET"
  ]
 },
 {
  "id": "g182",
  "type": "compound",
  "name": "STAR___",
  "words": [
   "FISH",
   "GAZER",
   "LIGHT",
   "DUST"
  ]
 },
 {
  "id": "g183",
  "type": "compound",
  "name": "SNOW___",
  "words": [
   "BALL",
   "MAN",
   "FLAKE",
   "STORM"
  ]
 },
 {
  "id": "g184",
  "type": "compound",
  "name": "RAIN___",
  "words": [
   "DROP",
   "BOW",
   "COAT",
   "FALL"
  ]
 },
 {
  "id": "g185",
  "type": "compound",
  "name": "TIME___",
  "words": [
   "TABLE",
   "LINE",
   "PIECE",
   "KEEPER"
  ]
 },
 {
  "id": "g186",
  "type": "compound",
  "name": "WATER___",
  "words": [
   "FALL",
   "MELON",
   "PROOF",
   "MARK"
  ]
 },
 {
  "id": "g187",
  "type": "compound",
  "name": "HAND___",
  "words": [
   "BAG",
   "SHAKE",
   "WRITING",
   "CUFF"
  ]
 },
 {
  "id": "g188",
  "type": "compound",
  "name": "FIRE___",
  "words": [
   "PLACE",
   "WORK",
   "FLY",
   "FIGHTER"
  ]
 },
 {
  "id": "g189",
  "type": "compound",
  "name": "MOON___",
  "words": [
   "LIGHT",
   "WALK",
   "STONE",
   "BEAM"
  ]
 },
 {
  "id": "g190",
  "type": "compound",
  "name": "HOME___",
  "words": [
   "WORK",
   "MADE",
   "SICK",
   "TOWN"
  ]
 },
 {
  "id": "g191",
  "type": "wordplay",
  "name": "ANAGRAMS OF EAST",
  "words": [
   "EAST",
   "SEAT",
   "TEAS",
   "EATS"
  ]
 },
 {
  "id": "g192",
  "type": "wordplay",
  "name": "ANAGRAMS OF STOP",
  "words": [
   "STOP",
   "POTS",
   "POST",
   "SPOT"
  ]
 },
 {
  "id": "g193",
  "type": "wordplay",
  "name": "ANAGRAMS OF LEAST",
  "words": [
   "LEAST",
   "STALE",
   "STEAL",
   "TALES"
  ]
 },
 {
  "id": "g194",
  "type": "wordplay",
  "name": "RHYMES WITH BLUE",
  "words": [
   "TRUE",
   "SHOE",
   "GLUE",
   "CLUE"
  ]
 },
 {
  "id": "g195",
  "type": "wordplay",
  "name": "RHYMES WITH TIME",
  "words": [
   "RHYME",
   "CHIME",
   "LIME",
   "DIME"
  ]
 },
 {
  "id": "g196",
  "type": "wordplay",
  "name": "RHYMES WITH CAT",
  "words": [
   "HAT",
   "MAT",
   "SAT",
   "BAT"
  ]
 },
 {
  "id": "g197",
  "type": "wordplay",
  "name": "RHYMES WITH SING",
  "words": [
   "RING",
   "KING",
   "WING",
   "THING"
  ]
 },
 {
  "id": "g198",
  "type": "wordplay",
  "name": "ONE LETTER FROM COLD",
  "words": [
   "BOLD",
   "GOLD",
   "FOLD",
   "HOLD"
  ]
 },
 {
  "id": "g199",
  "type": "wordplay",
  "name": "ONE LETTER FROM MOUSE",
  "words": [
   "HOUSE",
   "LOUSE",
   "ROUSE",
   "DOUSE"
  ]
 },
 {
  "id": "g200",
  "type": "wordplay",
  "name": "ONE LETTER FROM FINE",
  "words": [
   "LINE",
   "MINE",
   "PINE",
   "VINE"
  ]
 },
 {
  "id": "g201",
  "type": "wordplay",
  "name": "HOMOPHONES OF LETTER NAMES",
  "words": [
   "SEA",
   "BEE",
   "WHY",
   "ARE"
  ]
 },
 {
  "id": "g202",
  "type": "wordplay",
  "name": "WORDS THAT SOUND LIKE NUMBERS",
  "words": [
   "WON",
   "TOO",
   "FORE",
   "ATE"
  ]
 },
 {
  "id": "g203",
  "type": "meaning",
  "name": "SYNONYMS OF ANGRY",
  "words": [
   "FURIOUS",
   "IRATE",
   "LIVID",
   "ENRAGED"
  ]
 },
 {
  "id": "g204",
  "type": "meaning",
  "name": "SYNONYMS OF HAPPY",
  "words": [
   "ELATED",
   "JOYOUS",
   "DELIGHTED",
   "ECSTATIC"
  ]
 },
 {
  "id": "g205",
  "type": "meaning",
  "name": "SYNONYMS OF SMALL",
  "words": [
   "TINY",
   "MINUTE",
   "MINUSCULE",
   "MICROSCOPIC"
  ]
 },
 {
  "id": "g206",
  "type": "meaning",
  "name": "SYNONYMS OF QUICK",
  "words": [
   "RAPID",
   "SWIFT",
   "SPEEDY",
   "BRISK"
  ]
 },
 {
  "id": "g207",
  "type": "meaning",
  "name": "SYNONYMS OF QUIET",
  "words": [
   "SILENT",
   "HUSHED",
   "MUTED",
   "SOUNDLESS"
  ]
 },
 {
  "id": "g208",
  "type": "meaning",
  "name": "WAYS TO LOOK",
  "words": [
   "GAZE",
   "STARE",
   "PEEK",
   "GLANCE"
  ]
 },
 {
  "id": "g209",
  "type": "meaning",
  "name": "WAYS TO WALK SLOWLY",
  "words": [
   "AMBLE",
   "STROLL",
   "SAUNTER",
   "MEANDER"
  ]
 },
 {
  "id": "g210",
  "type": "meaning",
  "name": "SYNONYMS OF PROTECT",
  "words": [
   "SHIELD",
   "GUARD",
   "DEFEND",
   "SAFEGUARD"
  ]
 },
 {
  "id": "g211",
  "type": "meaning",
  "name": "SYNONYMS OF ELEGANT",
  "words": [
   "GRACEFUL",
   "REFINED",
   "STYLISH",
   "SOPHISTICATED"
  ]
 },
 {
  "id": "g212",
  "type": "meaning",
  "name": "SYNONYMS OF FEAR",
  "words": [
   "DREAD",
   "TERROR",
   "PANIC",
   "FRIGHT"
  ]
 },
 {
  "id": "g213",
  "type": "meaning",
  "name": "SYNONYMS OF CRUEL",
  "words": [
   "HARSH",
   "BRUTAL",
   "VICIOUS",
   "SAVAGE"
  ]
 },
 {
  "id": "g214",
  "type": "meaning",
  "name": "SYNONYMS OF DELICIOUS",
  "words": [
   "TASTY",
   "SCRUMPTIOUS",
   "DELECTABLE",
   "LUSCIOUS"
  ]
 },
 {
  "id": "g215",
  "type": "meaning",
  "name": "SYNONYMS OF CONFUSED",
  "words": [
   "BAFFLED",
   "PERPLEXED",
   "PUZZLED",
   "BEWILDERED"
  ]
 },
 {
  "id": "g216",
  "type": "meaning",
  "name": "SYNONYMS OF COLD",
  "words": [
   "CHILLY",
   "FREEZING",
   "ICY",
   "FRIGID"
  ]
 },
 {
  "id": "g217",
  "type": "meaning",
  "name": "SYNONYMS OF HUGE",
  "words": [
   "ENORMOUS",
   "GIGANTIC",
   "MASSIVE",
   "IMMENSE"
  ]
 },
 {
  "id": "g218",
  "type": "meaning",
  "name": "WAYS TO GLITTER",
  "words": [
   "SPARKLE",
   "SHIMMER",
   "GLEAM",
   "TWINKLE"
  ]
 },
 {
  "id": "g219",
  "type": "meaning",
  "name": "SYNONYMS OF STRONG",
  "words": [
   "ROBUST",
   "STURDY",
   "SOLID",
   "TOUGH"
  ]
 },
 {
  "id": "g220",
  "type": "meaning",
  "name": "SYNONYMS OF SNEAKY",
  "words": [
   "SLY",
   "CRAFTY",
   "CUNNING",
   "DEVIOUS"
  ]
 },
 {
  "id": "g221",
  "type": "meaning",
  "name": "SYNONYMS OF CLEAN",
  "words": [
   "SPOTLESS",
   "IMMACULATE",
   "PRISTINE",
   "UNSULLIED"
  ]
 },
 {
  "id": "g222",
  "type": "meaning",
  "name": "SYNONYMS OF BRIEF",
  "words": [
   "SHORT",
   "CONCISE",
   "CURT",
   "TERSE"
  ]
 },
 {
  "id": "g223",
  "type": "culture",
  "name": "FICTIONAL DETECTIVES",
  "words": [
   "HOLMES",
   "POIROT",
   "MARPLE",
   "MORSE"
  ]
 },
 {
  "id": "g224",
  "type": "culture",
  "name": "SHAKESPEARE TRAGEDIES",
  "words": [
   "HAMLET",
   "MACBETH",
   "OTHELLO",
   "LEAR"
  ]
 },
 {
  "id": "g225",
  "type": "culture",
  "name": "GREEK GODS",
  "words": [
   "ZEUS",
   "HERA",
   "APOLLO",
   "ATHENA"
  ]
 },
 {
  "id": "g226",
  "type": "culture",
  "name": "GREEK MYTHICAL CREATURES",
  "words": [
   "MINOTAUR",
   "CENTAUR",
   "CYCLOPS",
   "HYDRA"
  ]
 },
 {
  "id": "g227",
  "type": "culture",
  "name": "THE BEATLES",
  "words": [
   "JOHN",
   "PAUL",
   "GEORGE",
   "RINGO"
  ]
 },
 {
  "id": "g228",
  "type": "culture",
  "name": "CLUEDO SUSPECT SURNAMES",
  "words": [
   "SCARLETT",
   "MUSTARD",
   "PEACOCK",
   "PLUM"
  ]
 },
 {
  "id": "g229",
  "type": "culture",
  "name": "STAR WARS PLANETS",
  "words": [
   "TATOOINE",
   "NABOO",
   "HOTH",
   "ENDOR"
  ]
 },
 {
  "id": "g230",
  "type": "culture",
  "name": "MARIO GAME CHARACTERS",
  "words": [
   "MARIO",
   "LUIGI",
   "PEACH",
   "BOWSER"
  ]
 },
 {
  "id": "g231",
  "type": "culture",
  "name": "FICTIONAL SUPERHEROES",
  "words": [
   "THOR",
   "HULK",
   "BATMAN",
   "SUPERMAN"
  ]
 },
 {
  "id": "g232",
  "type": "culture",
  "name": "GREEK MUSES",
  "words": [
   "CALLIOPE",
   "CLIO",
   "ERATO",
   "THALIA"
  ]
 },
 {
  "id": "g233",
  "type": "culture",
  "name": "JAMES BOND FILMS",
  "words": [
   "GOLDFINGER",
   "SKYFALL",
   "SPECTRE",
   "OCTOPUSSY"
  ]
 },
 {
  "id": "g234",
  "type": "culture",
  "name": "FAIRY TALE CHARACTERS",
  "words": [
   "CINDERELLA",
   "RAPUNZEL",
   "PINOCCHIO",
   "RUMPELSTILTSKIN"
  ]
 },
 {
  "id": "g235",
  "type": "culture",
  "name": "FICTIONAL WIZARDS",
  "words": [
   "MERLIN",
   "GANDALF",
   "DUMBLEDORE",
   "SARUMAN"
  ]
 },
 {
  "id": "g236",
  "type": "culture",
  "name": "FICTIONAL BEARS",
  "words": [
   "PADDINGTON",
   "POOH",
   "BALOO",
   "YOGI"
  ]
 },
 {
  "id": "g237",
  "type": "culture",
  "name": "THE FOUR HORSEMEN",
  "words": [
   "WAR",
   "FAMINE",
   "PESTILENCE",
   "DEATH"
  ]
 },
 {
  "id": "g238",
  "type": "culture",
  "name": "ART MOVEMENTS",
  "words": [
   "CUBISM",
   "SURREALISM",
   "IMPRESSIONISM",
   "EXPRESSIONISM"
  ]
 },
 {
  "id": "g239",
  "type": "culture",
  "name": "PAINTING EQUIPMENT",
  "words": [
   "EASEL",
   "CANVAS",
   "PALETTE",
   "BRUSH"
  ]
 },
 {
  "id": "g240",
  "type": "culture",
  "name": "WESTERN ZODIAC SIGNS",
  "words": [
   "ARIES",
   "TAURUS",
   "GEMINI",
   "CANCER"
  ]
 },
 {
  "id": "g241",
  "type": "culture",
  "name": "DOCTOR WHO ENEMIES",
  "words": [
   "DALEK",
   "CYBERMAN",
   "SONTARAN",
   "AUTON"
  ]
 },
 {
  "id": "g242",
  "type": "culture",
  "name": "HARRY POTTER HOUSES",
  "words": [
   "GRYFFINDOR",
   "SLYTHERIN",
   "RAVENCLAW",
   "HUFFLEPUFF"
  ]
 },
 {
  "id": "g243",
  "type": "geography",
  "name": "EUROPEAN CAPITALS",
  "words": [
   "LONDON",
   "PARIS",
   "ROME",
   "MADRID"
  ]
 },
 {
  "id": "g244",
  "type": "geography",
  "name": "MORE EUROPEAN CAPITALS",
  "words": [
   "BERLIN",
   "LISBON",
   "VIENNA",
   "PRAGUE"
  ]
 },
 {
  "id": "g245",
  "type": "geography",
  "name": "US STATES",
  "words": [
   "NEVADA",
   "UTAH",
   "MAINE",
   "OREGON"
  ]
 },
 {
  "id": "g246",
  "type": "geography",
  "name": "MAJOR RIVERS",
  "words": [
   "NILE",
   "THAMES",
   "SEINE",
   "DANUBE"
  ]
 },
 {
  "id": "g247",
  "type": "geography",
  "name": "FAMOUS MOUNTAINS",
  "words": [
   "EVEREST",
   "FUJI",
   "DENALI",
   "KILIMANJARO"
  ]
 },
 {
  "id": "g248",
  "type": "geography",
  "name": "DESERTS",
  "words": [
   "SAHARA",
   "GOBI",
   "ATACAMA",
   "KALAHARI"
  ]
 },
 {
  "id": "g249",
  "type": "geography",
  "name": "MEDITERRANEAN ISLANDS",
  "words": [
   "CRETE",
   "SICILY",
   "CYPRUS",
   "SARDINIA"
  ]
 },
 {
  "id": "g250",
  "type": "geography",
  "name": "OCEANS",
  "words": [
   "PACIFIC",
   "ATLANTIC",
   "INDIAN",
   "ARCTIC"
  ]
 },
 {
  "id": "g251",
  "type": "geography",
  "name": "ENGLISH COUNTIES",
  "words": [
   "KENT",
   "DEVON",
   "DORSET",
   "NORFOLK"
  ]
 },
 {
  "id": "g252",
  "type": "geography",
  "name": "ENGLISH CITIES",
  "words": [
   "YORK",
   "LEEDS",
   "BRISTOL",
   "DURHAM"
  ]
 },
 {
  "id": "g253",
  "type": "geography",
  "name": "SCOTTISH CITIES",
  "words": [
   "GLASGOW",
   "EDINBURGH",
   "DUNDEE",
   "STIRLING"
  ]
 },
 {
  "id": "g254",
  "type": "geography",
  "name": "WELSH CITIES",
  "words": [
   "CARDIFF",
   "SWANSEA",
   "NEWPORT",
   "BANGOR"
  ]
 },
 {
  "id": "g255",
  "type": "geography",
  "name": "EUROPEAN COUNTRIES",
  "words": [
   "SPAIN",
   "GREECE",
   "ITALY",
   "POLAND"
  ]
 },
 {
  "id": "g256",
  "type": "geography",
  "name": "LANDLOCKED EUROPEAN COUNTRIES",
  "words": [
   "SWITZERLAND",
   "AUSTRIA",
   "HUNGARY",
   "SLOVAKIA"
  ]
 },
 {
  "id": "g257",
  "type": "geography",
  "name": "FAMOUS VOLCANOES",
  "words": [
   "ETNA",
   "VESUVIUS",
   "KRAKATOA",
   "STROMBOLI"
  ]
 },
 {
  "id": "g258",
  "type": "geography",
  "name": "PACIFIC ISLAND NATIONS",
  "words": [
   "FIJI",
   "SAMOA",
   "TONGA",
   "VANUATU"
  ]
 },
 {
  "id": "g259",
  "type": "geography",
  "name": "CONTINENTS",
  "words": [
   "AFRICA",
   "EUROPE",
   "ASIA",
   "ANTARCTICA"
  ]
 },
 {
  "id": "g260",
  "type": "geography",
  "name": "ANCIENT WONDERS",
  "words": [
   "PYRAMID",
   "COLOSSUS",
   "LIGHTHOUSE",
   "MAUSOLEUM"
  ]
 },
 {
  "id": "g261",
  "type": "geography",
  "name": "ROME LANDMARKS",
  "words": [
   "COLOSSEUM",
   "PANTHEON",
   "FORUM",
   "TREVI"
  ]
 },
 {
  "id": "g262",
  "type": "geography",
  "name": "SOUTH AMERICAN COUNTRIES",
  "words": [
   "CHILE",
   "PERU",
   "BRAZIL",
   "ECUADOR"
  ]
 },
 {
  "id": "g263",
  "type": "geography",
  "name": "CITIES ON THE THAMES",
  "words": [
   "LONDON",
   "OXFORD",
   "READING",
   "WINDSOR"
  ]
 },
 {
  "id": "g264",
  "type": "geography",
  "name": "INDIAN CITIES",
  "words": [
   "DELHI",
   "MUMBAI",
   "CHENNAI",
   "KOLKATA"
  ]
 },
 {
  "id": "g265",
  "type": "geography",
  "name": "CANADIAN PROVINCES",
  "words": [
   "ONTARIO",
   "QUEBEC",
   "ALBERTA",
   "MANITOBA"
  ]
 },
 {
  "id": "g266",
  "type": "geography",
  "name": "MOUNTAIN RANGES",
  "words": [
   "ALPS",
   "ANDES",
   "HIMALAYAS",
   "ROCKIES"
  ]
 }
];
 root.FOURFOLD_BANK=groups;
 if(typeof module==='object'&&module.exports)module.exports=groups;
})(typeof window==='object'?window:globalThis);
