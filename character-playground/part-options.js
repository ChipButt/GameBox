// Curated Character Workshop catalogue built from the Quaternius pack's labelled regions.
// The 52 source characters are donors; this list exposes only meaningful modular choices.
export const PART_CATEGORY_LABELS = {
  "head": "Face",
  "hair": "Hair",
  "facialHair": "Facial Hair",
  "headwear": "Headwear",
  "top": "Top",
  "bottom": "Bottom",
  "shoes": "Shoes",
  "accessory": "Accessories"
};

export const PART_OPTIONS = {
  "head": [
    {
      "id": "head-01",
      "label": "Human Head",
      "sourceId": "BaseCharacter",
      "sourceIds": [
        "BaseCharacter",
        "BlueSoldier_Female",
        "BlueSoldier_Male",
        "Casual2_Female",
        "Casual2_Male",
        "Casual3_Female",
        "Casual3_Male",
        "Casual_Bald",
        "Casual_Female",
        "Casual_Male",
        "Chef_Female",
        "Chef_Hat",
        "Chef_Male",
        "Cowboy_Female",
        "Cowboy_Hair",
        "Cowboy_Male",
        "Doctor_Female_Old",
        "Doctor_Female_Young",
        "Doctor_Male_Old",
        "Doctor_Male_Young",
        "Kimono_Female",
        "Kimono_Male",
        "Knight_Golden_Female",
        "Knight_Golden_Male",
        "Knight_Male",
        "Ninja_Female",
        "Ninja_Male",
        "Ninja_Male_Hair",
        "Ninja_Sand",
        "Ninja_Sand_Female",
        "OldClassy_Female",
        "OldClassy_Male",
        "Pirate_Female",
        "Pirate_Male",
        "Soldier_Female",
        "Soldier_Male",
        "Suit_Female",
        "Suit_Male",
        "VikingHelmet",
        "Viking_Female",
        "Viking_Male",
        "Worker_Female",
        "Worker_Male"
      ],
      "baseColors": {
        "Skin": "#d6a67d",
        "Face": "#f2dfc2"
      },
      "kind": "source",
      "category": "head"
    },
    {
      "id": "head-06",
      "label": "Elf Head",
      "sourceId": "Elf",
      "sourceIds": [
        "Elf",
        "Witch",
        "Wizard"
      ],
      "baseColors": {
        "Skin": "#d6a67d",
        "Face": "#f2dfc2"
      },
      "kind": "source",
      "category": "head"
    },
    {
      "id": "head-07",
      "label": "Goblin Head · Feminine",
      "sourceId": "Goblin_Female",
      "sourceIds": [
        "Goblin_Female"
      ],
      "baseColors": {
        "Skin": "#74813f",
        "Face": "#4d542a"
      },
      "kind": "source",
      "category": "head"
    },
    {
      "id": "head-08",
      "label": "Goblin Head · Masculine",
      "sourceId": "Goblin_Male",
      "sourceIds": [
        "Goblin_Male"
      ],
      "baseColors": {
        "Skin": "#74813f",
        "Face": "#4d542a",
        "Teeth": "#d5d0a0"
      },
      "kind": "source",
      "category": "head"
    },
    {
      "id": "head-03",
      "label": "Cow Head",
      "sourceId": "Cow",
      "sourceIds": [
        "Cow"
      ],
      "baseColors": {
        "White": "#dddddd",
        "Black": "#252525",
        "Pink": "#d66a73"
      },
      "kind": "source",
      "category": "head"
    },
    {
      "id": "head-14",
      "label": "Pug Head",
      "sourceId": "Pug",
      "sourceIds": [
        "Pug"
      ],
      "baseColors": {
        "Beige": "#c9a06d",
        "Brown": "#5d3b2a"
      },
      "kind": "source",
      "category": "head"
    },
    {
      "id": "head-17",
      "label": "Zombie Head · Feminine",
      "sourceId": "Zombie_Female",
      "sourceIds": [
        "Zombie_Female"
      ],
      "baseColors": {
        "Skin": "#74836a",
        "Face": "#485247"
      },
      "kind": "source",
      "category": "head"
    },
    {
      "id": "head-18",
      "label": "Zombie Head · Masculine",
      "sourceId": "Zombie_Male",
      "sourceIds": [
        "Zombie_Male"
      ],
      "baseColors": {
        "Skin": "#74836a",
        "Face": "#485247",
        "Brain": "#a55a6b"
      },
      "kind": "source",
      "category": "head"
    }
  ],
  "hair": [
    {
      "id": "hair-soldier-f",
      "label": "Soldier Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "BlueSoldier_Female",
      "sourceIds": [
        "BlueSoldier_Female",
        "Soldier_Female"
      ],
      "baseColors": {
        "Hair": "#5a2518"
      }
    },
    {
      "id": "hair-casual2-f",
      "label": "Casual Hair 2 · Feminine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Casual2_Female",
      "sourceIds": [
        "Casual2_Female",
        "Goblin_Female",
        "OldClassy_Female",
        "Suit_Female",
        "Witch"
      ],
      "baseColors": {
        "Hair": "#9f8c76"
      }
    },
    {
      "id": "hair-casual2-m",
      "label": "Casual Hair 2 · Masculine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Casual2_Male",
      "sourceIds": [
        "Casual2_Male"
      ],
      "baseColors": {
        "Hair": "#5b4328"
      }
    },
    {
      "id": "hair-casual3-f",
      "label": "Casual Hair 3 · Feminine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Casual3_Female",
      "sourceIds": [
        "Casual3_Female",
        "Chef_Female"
      ],
      "baseColors": {
        "Hair": "#6b6247"
      }
    },
    {
      "id": "hair-casual3-m",
      "label": "Casual Hair 3 · Masculine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Casual3_Male",
      "sourceIds": [
        "Casual3_Male"
      ],
      "baseColors": {
        "Hair": "#352b25"
      }
    },
    {
      "id": "hair-casual-f",
      "label": "Casual Hair · Feminine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Casual_Female",
      "sourceIds": [
        "Casual_Female",
        "Cowboy_Female",
        "Ninja_Female",
        "Ninja_Sand_Female"
      ],
      "baseColors": {
        "Hair": "#4c2439"
      }
    },
    {
      "id": "hair-casual-m",
      "label": "Casual Hair · Masculine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Casual_Male",
      "sourceIds": [
        "Casual_Male",
        "Cowboy_Hair",
        "Suit_Male"
      ],
      "baseColors": {
        "Hair": "#624227"
      }
    },
    {
      "id": "hair-chef-m",
      "label": "Chef Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Chef_Male",
      "sourceIds": [
        "Chef_Male"
      ],
      "baseColors": {
        "Hair": "#777777"
      }
    },
    {
      "id": "hair-cowboy-m",
      "label": "Cowboy Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Cowboy_Male",
      "sourceIds": [
        "Cowboy_Male"
      ],
      "baseColors": {
        "Hair": "#5a311e"
      }
    },
    {
      "id": "hair-doctor-old-f",
      "label": "Doctor Hair · Senior Feminine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Doctor_Female_Old",
      "sourceIds": [
        "Doctor_Female_Old"
      ],
      "baseColors": {
        "Hair": "#8a8a8a"
      }
    },
    {
      "id": "hair-doctor-young-f",
      "label": "Doctor Hair · Young Feminine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Doctor_Female_Young",
      "sourceIds": [
        "Doctor_Female_Young"
      ],
      "baseColors": {
        "Hair": "#704122"
      }
    },
    {
      "id": "hair-doctor-old-m",
      "label": "Doctor Hair · Senior Masculine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Doctor_Male_Old",
      "sourceIds": [
        "Doctor_Male_Old"
      ],
      "baseColors": {
        "Hair": "#8a8a8a"
      }
    },
    {
      "id": "hair-doctor-young-m",
      "label": "Doctor Hair · Young Masculine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Doctor_Male_Young",
      "sourceIds": [
        "Doctor_Male_Young"
      ],
      "baseColors": {
        "Hair": "#704522"
      }
    },
    {
      "id": "hair-kimono-f",
      "label": "Kimono Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Kimono_Female",
      "sourceIds": [
        "Kimono_Female"
      ],
      "baseColors": {
        "Hair": "#55253d"
      }
    },
    {
      "id": "hair-knight-f",
      "label": "Knight Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Knight_Golden_Female",
      "sourceIds": [
        "Knight_Golden_Female"
      ],
      "baseColors": {
        "Hair": "#5b4328"
      }
    },
    {
      "id": "hair-ninja-m",
      "label": "Ninja Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Ninja_Male_Hair",
      "sourceIds": [
        "Ninja_Male_Hair"
      ],
      "baseColors": {
        "Hair": "#28534d"
      }
    },
    {
      "id": "hair-classic-m",
      "label": "Classic Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "OldClassy_Male",
      "sourceIds": [
        "OldClassy_Male"
      ],
      "baseColors": {
        "Hair": "#8a8a8a"
      }
    },
    {
      "id": "hair-pirate-f",
      "label": "Pirate Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Pirate_Female",
      "sourceIds": [
        "Pirate_Female"
      ],
      "baseColors": {
        "Hair": "#5a3820"
      }
    },
    {
      "id": "hair-viking-f",
      "label": "Viking Hair · Feminine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Viking_Female",
      "sourceIds": [
        "Viking_Female"
      ],
      "baseColors": {
        "Hair": "#4f241b"
      }
    },
    {
      "id": "hair-viking-m",
      "label": "Viking Hair · Masculine",
      "kind": "source",
      "category": "hair",
      "sourceId": "Viking_Male",
      "sourceIds": [
        "Viking_Male"
      ],
      "baseColors": {
        "Hair": "#4f241b"
      }
    },
    {
      "id": "hair-wizard",
      "label": "Wizard Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Wizard",
      "sourceIds": [
        "Wizard"
      ],
      "baseColors": {
        "Hair": "#a3a3a3"
      }
    },
    {
      "id": "hair-worker-f",
      "label": "Worker Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Worker_Female",
      "sourceIds": [
        "Worker_Female"
      ],
      "baseColors": {
        "Hair": "#5a3820"
      }
    },
    {
      "id": "hair-zombie-f",
      "label": "Zombie Hair",
      "kind": "source",
      "category": "hair",
      "sourceId": "Zombie_Female",
      "sourceIds": [
        "Zombie_Female"
      ],
      "baseColors": {
        "Hair": "#33251f"
      }
    }
  ],
  "facialHair": [
    {
      "id": "facialhair-moustache",
      "label": "Moustache",
      "kind": "source",
      "category": "facialHair",
      "sourceId": "Chef_Hat",
      "sourceIds": [
        "Chef_Hat"
      ],
      "baseColors": {
        "Facial Hair": "#d7c6ad"
      }
    }
  ],
  "headwear": [
    {
      "id": "headwear-soldier",
      "label": "Soldier Helmet",
      "kind": "source",
      "category": "headwear",
      "sourceId": "BlueSoldier_Male",
      "sourceIds": [
        "BlueSoldier_Male",
        "Soldier_Male"
      ],
      "baseColors": {
        "Helmet": "#35402f"
      },
      "hairMode": "hide"
    },
    {
      "id": "headwear-chef",
      "label": "Chef Hat",
      "kind": "source",
      "category": "headwear",
      "sourceId": "Chef_Hat",
      "sourceIds": [
        "Chef_Hat"
      ],
      "baseColors": {
        "Hat": "#e9e7d6"
      },
      "hairMode": "hide"
    },
    {
      "id": "headwear-cowboy",
      "label": "Cowboy Hat",
      "kind": "source",
      "category": "headwear",
      "sourceId": "Cowboy_Female",
      "sourceIds": [
        "Cowboy_Female",
        "Cowboy_Hair",
        "Cowboy_Male"
      ],
      "baseColors": {
        "Hat": "#7a472d",
        "Band": "#c7774e"
      },
      "hairMode": "overlay"
    },
    {
      "id": "headwear-elf",
      "label": "Elf / Wizard Hat",
      "kind": "source",
      "category": "headwear",
      "sourceId": "Elf",
      "sourceIds": [
        "Elf",
        "Wizard"
      ],
      "baseColors": {
        "Hat": "#24405e",
        "Band / Gold trim": "#d4aa43"
      },
      "hairMode": "hide"
    },
    {
      "id": "headwear-classic",
      "label": "Classic Hat",
      "kind": "source",
      "category": "headwear",
      "sourceId": "OldClassy_Female",
      "sourceIds": [
        "OldClassy_Female",
        "OldClassy_Male"
      ],
      "baseColors": {
        "Hat": "#34332f"
      },
      "hairMode": "overlay"
    },
    {
      "id": "headwear-viking",
      "label": "Viking Helmet",
      "kind": "source",
      "category": "headwear",
      "sourceId": "VikingHelmet",
      "sourceIds": [
        "VikingHelmet"
      ],
      "baseColors": {
        "Helmet": "#555555",
        "Horns": "#9e895f"
      },
      "hairMode": "hide"
    },
    {
      "id": "headwear-witch",
      "label": "Witch Hat",
      "kind": "source",
      "category": "headwear",
      "sourceId": "Witch",
      "sourceIds": [
        "Witch"
      ],
      "baseColors": {
        "Hat": "#28324b"
      },
      "hairMode": "overlay"
    },
    {
      "id": "headwear-worker",
      "label": "Worker Hat",
      "kind": "source",
      "category": "headwear",
      "sourceId": "Worker_Female",
      "sourceIds": [
        "Worker_Female",
        "Worker_Male"
      ],
      "baseColors": {
        "Hat": "#8a7931"
      },
      "hairMode": "hide"
    }
  ],
  "top": [
    {
      "id": "top-base",
      "label": "Bare / Base Body",
      "kind": "source",
      "category": "top",
      "sourceId": "BaseCharacter",
      "sourceIds": [
        "BaseCharacter"
      ],
      "baseColors": {
        "Skin": "#d6a67d"
      }
    },
    {
      "id": "top-soldier-f",
      "label": "Soldier Top · Feminine",
      "kind": "source",
      "category": "top",
      "sourceId": "BlueSoldier_Female",
      "sourceIds": [
        "BlueSoldier_Female",
        "Soldier_Female"
      ],
      "baseColors": {
        "Primary": "#33442b",
        "Dark": "#272727"
      }
    },
    {
      "id": "top-soldier-m",
      "label": "Soldier Top · Masculine",
      "kind": "source",
      "category": "top",
      "sourceId": "BlueSoldier_Male",
      "sourceIds": [
        "BlueSoldier_Male",
        "Soldier_Male"
      ],
      "baseColors": {
        "Primary": "#33442b",
        "Dark": "#272727"
      }
    },
    {
      "id": "top-casual2",
      "label": "Casual Top 2",
      "kind": "source",
      "category": "top",
      "sourceId": "Casual2_Female",
      "sourceIds": [
        "Casual2_Female",
        "Casual2_Male"
      ],
      "baseColors": {
        "Shirt": "#4b435f"
      }
    },
    {
      "id": "top-casual3",
      "label": "Casual Top 3",
      "kind": "source",
      "category": "top",
      "sourceId": "Casual3_Female",
      "sourceIds": [
        "Casual3_Female",
        "Casual3_Male"
      ],
      "baseColors": {
        "Shirt": "#5b5955"
      }
    },
    {
      "id": "top-casual",
      "label": "Casual Top",
      "kind": "source",
      "category": "top",
      "sourceId": "Casual_Bald",
      "sourceIds": [
        "Casual_Bald",
        "Casual_Female",
        "Casual_Male"
      ],
      "baseColors": {
        "Shirt": "#394b65"
      }
    },
    {
      "id": "top-chef",
      "label": "Chef Jacket",
      "kind": "source",
      "category": "top",
      "sourceId": "Chef_Female",
      "sourceIds": [
        "Chef_Female",
        "Chef_Hat",
        "Chef_Male"
      ],
      "baseColors": {
        "Clothes": "#bcbcbc"
      }
    },
    {
      "id": "top-suit",
      "label": "Suit",
      "kind": "source",
      "category": "top",
      "sourceId": "Suit_Female",
      "sourceIds": [
        "Suit_Female",
        "Suit_Male",
        "Cow",
        "Pug"
      ],
      "baseColors": {
        "Shirt": "#bdbdbd",
        "Dark": "#242424"
      }
    },
    {
      "id": "top-cowboy",
      "label": "Cowboy Jacket",
      "kind": "source",
      "category": "top",
      "sourceId": "Cowboy_Female",
      "sourceIds": [
        "Cowboy_Female",
        "Cowboy_Hair",
        "Cowboy_Male"
      ],
      "baseColors": {
        "Jacket": "#653520",
        "Top": "#3b2a20"
      }
    },
    {
      "id": "top-doctor",
      "label": "Doctor Coat",
      "kind": "source",
      "category": "top",
      "sourceId": "Doctor_Female_Old",
      "sourceIds": [
        "Doctor_Female_Old",
        "Doctor_Female_Young",
        "Doctor_Male_Old",
        "Doctor_Male_Young"
      ],
      "baseColors": {
        "Main": "#8b8b8b",
        "Dark": "#365d51"
      }
    },
    {
      "id": "top-fantasy",
      "label": "Fantasy Tunic",
      "kind": "source",
      "category": "top",
      "sourceId": "Elf",
      "sourceIds": [
        "Elf",
        "Witch",
        "Wizard"
      ],
      "baseColors": {
        "Clothes": "#304662",
        "Trim": "#8a5c2e"
      }
    },
    {
      "id": "top-goblin-f",
      "label": "Goblin Top · Feminine",
      "kind": "source",
      "category": "top",
      "sourceId": "Goblin_Female",
      "sourceIds": [
        "Goblin_Female"
      ],
      "baseColors": {
        "Shirt": "#70675b"
      }
    },
    {
      "id": "top-goblin-m",
      "label": "Goblin Top · Masculine",
      "kind": "source",
      "category": "top",
      "sourceId": "Goblin_Male",
      "sourceIds": [
        "Goblin_Male"
      ],
      "baseColors": {
        "Pants": "#4a3b29"
      }
    },
    {
      "id": "top-kimono",
      "label": "Kimono",
      "kind": "source",
      "category": "top",
      "sourceId": "Kimono_Female",
      "sourceIds": [
        "Kimono_Female",
        "Kimono_Male"
      ],
      "baseColors": {
        "Clothes": "#bcbcbc"
      }
    },
    {
      "id": "top-golden-knight",
      "label": "Golden Knight Armour",
      "kind": "source",
      "category": "top",
      "sourceId": "Knight_Golden_Female",
      "sourceIds": [
        "Knight_Golden_Female",
        "Knight_Golden_Male"
      ],
      "baseColors": {
        "Armor": "#8b7030",
        "Dark": "#303030"
      }
    },
    {
      "id": "top-knight",
      "label": "Knight Armour",
      "kind": "source",
      "category": "top",
      "sourceId": "Knight_Male",
      "sourceIds": [
        "Knight_Male"
      ],
      "baseColors": {
        "Armor": "#666666",
        "Dark": "#303030"
      }
    },
    {
      "id": "top-ninja",
      "label": "Ninja Outfit",
      "kind": "source",
      "category": "top",
      "sourceId": "Ninja_Female",
      "sourceIds": [
        "Ninja_Female",
        "Ninja_Male",
        "Ninja_Male_Hair",
        "Ninja_Sand",
        "Ninja_Sand_Female"
      ],
      "baseColors": {
        "Primary": "#3c3c3c",
        "Detail": "#513d2d"
      }
    },
    {
      "id": "top-classic",
      "label": "Classic Shirt",
      "kind": "source",
      "category": "top",
      "sourceId": "OldClassy_Female",
      "sourceIds": [
        "OldClassy_Female",
        "OldClassy_Male"
      ],
      "baseColors": {
        "Shirt": "#c5c5c5",
        "Detail": "#74452d"
      }
    },
    {
      "id": "top-pirate",
      "label": "Pirate Coat",
      "kind": "source",
      "category": "top",
      "sourceId": "Pirate_Female",
      "sourceIds": [
        "Pirate_Female",
        "Pirate_Male"
      ],
      "baseColors": {
        "Clothes": "#34394a",
        "Brown": "#5e432f",
        "Gold": "#9a6a32"
      }
    },
    {
      "id": "top-viking",
      "label": "Viking Tunic",
      "kind": "source",
      "category": "top",
      "sourceId": "Viking_Female",
      "sourceIds": [
        "Viking_Female",
        "Viking_Male",
        "VikingHelmet"
      ],
      "baseColors": {
        "Primary": "#553d34",
        "Light": "#a07f60"
      }
    },
    {
      "id": "top-worker",
      "label": "Workwear",
      "kind": "source",
      "category": "top",
      "sourceId": "Worker_Female",
      "sourceIds": [
        "Worker_Female",
        "Worker_Male"
      ],
      "baseColors": {
        "Shirt": "#879188",
        "Vest": "#65462f"
      }
    },
    {
      "id": "top-zombie",
      "label": "Zombie Clothes",
      "kind": "source",
      "category": "top",
      "sourceId": "Zombie_Female",
      "sourceIds": [
        "Zombie_Female",
        "Zombie_Male"
      ],
      "baseColors": {
        "Clothes": "#4c4568",
        "Dark": "#302b43"
      }
    }
  ],
  "bottom": [
    {
      "id": "bottom-base",
      "label": "Bare / Base Legs",
      "kind": "source",
      "category": "bottom",
      "sourceId": "BaseCharacter",
      "sourceIds": [
        "BaseCharacter"
      ],
      "baseColors": {
        "Skin": "#d6a67d"
      }
    },
    {
      "id": "bottom-soldier-f",
      "label": "Soldier Bottoms · Feminine",
      "kind": "source",
      "category": "bottom",
      "sourceId": "BlueSoldier_Female",
      "sourceIds": [
        "BlueSoldier_Female",
        "Soldier_Female"
      ],
      "baseColors": {
        "Primary": "#33442b",
        "Dark": "#272727"
      }
    },
    {
      "id": "bottom-soldier-m",
      "label": "Soldier Bottoms · Masculine",
      "kind": "source",
      "category": "bottom",
      "sourceId": "BlueSoldier_Male",
      "sourceIds": [
        "BlueSoldier_Male",
        "Soldier_Male"
      ],
      "baseColors": {
        "Primary": "#33442b",
        "Dark": "#272727"
      }
    },
    {
      "id": "bottom-casual2",
      "label": "Casual Bottoms 2",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Casual2_Female",
      "sourceIds": [
        "Casual2_Female",
        "Casual2_Male"
      ],
      "baseColors": {
        "Pants": "#313345"
      }
    },
    {
      "id": "bottom-casual3",
      "label": "Casual Bottoms 3",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Casual3_Female",
      "sourceIds": [
        "Casual3_Female",
        "Casual3_Male"
      ],
      "baseColors": {
        "Pants": "#404732"
      }
    },
    {
      "id": "bottom-casual",
      "label": "Casual Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Casual_Bald",
      "sourceIds": [
        "Casual_Bald",
        "Casual_Female",
        "Casual_Male"
      ],
      "baseColors": {
        "Pants": "#40352e"
      }
    },
    {
      "id": "bottom-chef",
      "label": "Chef Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Chef_Female",
      "sourceIds": [
        "Chef_Female",
        "Chef_Hat",
        "Chef_Male"
      ],
      "baseColors": {
        "Clothes": "#bcbcbc",
        "Dark": "#777777"
      }
    },
    {
      "id": "bottom-suit",
      "label": "Suit Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Suit_Female",
      "sourceIds": [
        "Suit_Female",
        "Suit_Male",
        "Cow",
        "Pug"
      ],
      "baseColors": {
        "Dark": "#242424"
      }
    },
    {
      "id": "bottom-cowboy",
      "label": "Cowboy Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Cowboy_Female",
      "sourceIds": [
        "Cowboy_Female",
        "Cowboy_Hair",
        "Cowboy_Male"
      ],
      "baseColors": {
        "Pants": "#45291f"
      }
    },
    {
      "id": "bottom-doctor",
      "label": "Doctor Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Doctor_Female_Old",
      "sourceIds": [
        "Doctor_Female_Old",
        "Doctor_Female_Young",
        "Doctor_Male_Old",
        "Doctor_Male_Young"
      ],
      "baseColors": {
        "Main": "#8b8b8b",
        "Dark": "#365d51"
      }
    },
    {
      "id": "bottom-fantasy",
      "label": "Fantasy Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Elf",
      "sourceIds": [
        "Elf",
        "Witch",
        "Wizard"
      ],
      "baseColors": {
        "Clothes": "#304662",
        "Trim": "#8a5c2e"
      }
    },
    {
      "id": "bottom-goblin-f",
      "label": "Goblin Bottoms · Feminine",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Goblin_Female",
      "sourceIds": [
        "Goblin_Female"
      ],
      "baseColors": {
        "Pants": "#4a3b29"
      }
    },
    {
      "id": "bottom-goblin-m",
      "label": "Goblin Bottoms · Masculine",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Goblin_Male",
      "sourceIds": [
        "Goblin_Male"
      ],
      "baseColors": {
        "Pants": "#4a3b29"
      }
    },
    {
      "id": "bottom-kimono",
      "label": "Kimono Bottom",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Kimono_Female",
      "sourceIds": [
        "Kimono_Female",
        "Kimono_Male"
      ],
      "baseColors": {
        "Clothes": "#bcbcbc"
      }
    },
    {
      "id": "bottom-golden-knight",
      "label": "Golden Knight Legs",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Knight_Golden_Female",
      "sourceIds": [
        "Knight_Golden_Female",
        "Knight_Golden_Male"
      ],
      "baseColors": {
        "Armor": "#8b7030",
        "Dark": "#303030"
      }
    },
    {
      "id": "bottom-knight",
      "label": "Knight Legs",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Knight_Male",
      "sourceIds": [
        "Knight_Male"
      ],
      "baseColors": {
        "Armor": "#666666",
        "Dark": "#303030"
      }
    },
    {
      "id": "bottom-ninja",
      "label": "Ninja Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Ninja_Female",
      "sourceIds": [
        "Ninja_Female",
        "Ninja_Male",
        "Ninja_Male_Hair",
        "Ninja_Sand",
        "Ninja_Sand_Female"
      ],
      "baseColors": {
        "Primary": "#3c3c3c",
        "Detail": "#513d2d"
      }
    },
    {
      "id": "bottom-classic",
      "label": "Classic Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "OldClassy_Female",
      "sourceIds": [
        "OldClassy_Female",
        "OldClassy_Male"
      ],
      "baseColors": {
        "Pants": "#646246"
      }
    },
    {
      "id": "bottom-pirate",
      "label": "Pirate Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Pirate_Female",
      "sourceIds": [
        "Pirate_Female",
        "Pirate_Male"
      ],
      "baseColors": {
        "Clothes": "#34394a",
        "Brown": "#5e432f"
      }
    },
    {
      "id": "bottom-viking",
      "label": "Viking Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Viking_Female",
      "sourceIds": [
        "Viking_Female",
        "Viking_Male",
        "VikingHelmet"
      ],
      "baseColors": {
        "Pants": "#3d2d27",
        "Light": "#a07f60"
      }
    },
    {
      "id": "bottom-worker",
      "label": "Worker Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Worker_Female",
      "sourceIds": [
        "Worker_Female",
        "Worker_Male"
      ],
      "baseColors": {
        "Pants": "#34485f"
      }
    },
    {
      "id": "bottom-zombie",
      "label": "Zombie Bottoms",
      "kind": "source",
      "category": "bottom",
      "sourceId": "Zombie_Female",
      "sourceIds": [
        "Zombie_Female",
        "Zombie_Male"
      ],
      "baseColors": {
        "Pants": "#756d4f",
        "Clothes": "#4c4568"
      }
    }
  ],
  "shoes": [],
  "accessory": [
    {
      "id": "accessory-suit-belt",
      "label": "Suit Belt",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Suit_Female",
      "sourceIds": [
        "Suit_Female",
        "Suit_Male",
        "Cow",
        "Pug"
      ],
      "baseColors": {
        "Belt": "#25252e"
      }
    },
    {
      "id": "accessory-cowboy-scarf",
      "label": "Cowboy Scarf",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Cowboy_Female",
      "sourceIds": [
        "Cowboy_Female",
        "Cowboy_Hair",
        "Cowboy_Male"
      ],
      "baseColors": {
        "Scarf": "#6b2f2f"
      }
    },
    {
      "id": "accessory-casual-belt",
      "label": "Casual Belt",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Casual_Bald",
      "sourceIds": [
        "Casual_Bald",
        "Casual_Female",
        "Casual_Male"
      ],
      "baseColors": {
        "Belt": "#4c382b"
      }
    },
    {
      "id": "accessory-chef-band",
      "label": "Chef Band",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Chef_Female",
      "sourceIds": [
        "Chef_Female",
        "Chef_Hat",
        "Chef_Male"
      ],
      "baseColors": {
        "Band": "#743631"
      }
    },
    {
      "id": "accessory-casual2-belt",
      "label": "Casual Belt 2",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Casual2_Female",
      "sourceIds": [
        "Casual2_Female",
        "Casual2_Male"
      ],
      "baseColors": {
        "Belt": "#4c382b"
      }
    },
    {
      "id": "accessory-classic-belt",
      "label": "Classic Belt",
      "kind": "source",
      "category": "accessory",
      "sourceId": "OldClassy_Female",
      "sourceIds": [
        "OldClassy_Female",
        "OldClassy_Male"
      ],
      "baseColors": {
        "Belt": "#583b2e"
      }
    },
    {
      "id": "accessory-elf-belt",
      "label": "Elf / Wizard Belt",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Elf",
      "sourceIds": [
        "Elf",
        "Wizard"
      ],
      "baseColors": {
        "Belt": "#4e3226"
      }
    },
    {
      "id": "accessory-casual3-belt",
      "label": "Casual Belt 3",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Casual3_Female",
      "sourceIds": [
        "Casual3_Female",
        "Casual3_Male"
      ],
      "baseColors": {
        "Belt": "#4c382b"
      }
    },
    {
      "id": "accessory-kimono-m",
      "label": "Kimono Band · Masculine",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Kimono_Male",
      "sourceIds": [
        "Kimono_Male"
      ],
      "baseColors": {
        "Band": "#743631"
      }
    },
    {
      "id": "accessory-kimono-f",
      "label": "Kimono Band · Feminine",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Kimono_Female",
      "sourceIds": [
        "Kimono_Female"
      ],
      "baseColors": {
        "Band": "#743631"
      }
    },
    {
      "id": "accessory-witch-belt",
      "label": "Witch Belt",
      "kind": "source",
      "category": "accessory",
      "sourceId": "Witch",
      "sourceIds": [
        "Witch"
      ],
      "baseColors": {
        "Belt": "#4e3226"
      }
    }
  ]
};

export const WEARABLE_OPTIONS = [
  {
    "id": "wearable-regular-shoes",
    "label": "Regular Shoes",
    "kind": "wearable",
    "category": "shoes",
    "wearableId": "regular-shoes",
    "path": "../assets/gamebox/wearables/footwear/regular-shoes/regular-shoes.glb",
    "preview": "../assets/gamebox/wearables/footwear/regular-shoes/preview.png",
    "baseColors": { "Shoes": "#5c5148" },
    "featured": true,
    "badge": "CUSTOM"
  },
  {
    "id": "wearable-traditional-elf-shoes",
    "label": "Traditional Elf Shoes",
    "kind": "wearable",
    "category": "shoes",
    "wearableId": "traditional-elf-shoes",
    "path": "../assets/gamebox/wearables/footwear/traditional-elf-shoes/traditional-elf-shoes.glb",
    "preview": "../assets/gamebox/wearables/footwear/traditional-elf-shoes/preview.png",
    "baseColors": { "Shoes": "#7a3135" },
    "featured": true,
    "badge": "CUSTOM"
  }
];

export const PART_SOURCE_TO_OPTION = Object.fromEntries(
  Object.entries(PART_OPTIONS).map(([category, options]) => {
    const map = {};
    for (const option of options) {
      for (const sourceId of option.sourceIds || [option.sourceId]) map[sourceId] = option.id;
    }
    return [category, map];
  })
);

export function optionsForPart(category) {
  if (category === 'shoes') return WEARABLE_OPTIONS.slice();
  return (PART_OPTIONS[category] || []).slice();
}

export function canonicalOptionForSource(category, sourceId) {
  const id = PART_SOURCE_TO_OPTION[category]?.[sourceId];
  if (!id) return null;
  return (PART_OPTIONS[category] || []).find((option) => option.id === id) || null;
}

export function optionById(category, optionId) {
  return optionsForPart(category).find((option) => option.id === optionId) || null;
}
