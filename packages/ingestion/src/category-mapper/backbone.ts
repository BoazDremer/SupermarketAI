/**
 * The 'common backbone' — a hand-curated 3-depth shopper-friendly category
 * tree that both Shufersal and Rami Levy chain categories get mapped onto.
 *
 * Each node carries optional 'chainHints' mapping it to Shufersal / Rami Levy
 * chain codes. The matcher (build-common-tree.ts) uses these hints (with a
 * walk-up over chain parents) to produce the RetailerCategoryAlias rows.
 *
 * Editing this file is the canonical place to evolve the taxonomy. Department-
 * specific fixes also live in `data/category-backbone-rules/` and are applied
 * via `apply-backbone-rules.ts` before `/general` leaves are synthesised.
 * After changing taxonomy or rules, re-run `pnpm scrape:categories` and
 * `pnpm map:products -- --overwrite`.
 */

import type { CommonCategoryNode } from '../scrapers/types.js';
import {
  applyInternalBackboneRules,
  backboneSkipAutoGeneralParents,
} from './apply-backbone-rules.js';

export type BackboneNode = {
  id: string;
  nameHe: string;
  nameEn: string;
  /** Lucide icon name (top-level groups only). */
  icon?: string;
  /** Parent id (root nodes have none). */
  parentId?: string;
  /** Chain codes that should resolve to this node. */
  chainHints?: {
    shufersal?: readonly string[];
    ramiLevy?: readonly string[];
  };
  children: readonly BackboneNode[];
};

/**
 * Hand-authored backbone. Every product MUST end up on a terminal node
 * (leaf), so for each group with `chainHints` we synthesise a `<id>/general`
 * terminal child below this constant via {@link ensureFallbackLeaves}. The
 * exported `COMMON_BACKBONE` is the post-synthesis tree.
 */
const RAW_COMMON_BACKBONE: ReadonlyArray<BackboneNode> = [
    {
      "id": "dept/פירות-וירקות",
      "nameHe": "פירות וירקות",
      "nameEn": "פירות וירקות",
      "icon": "Salad",
      "chainHints": {
        "ramiLevy": [
          "49"
        ]
      },
      "children": [
        {
          "id": "dept/פירות-וירקות/פירות",
          "nameHe": "פירות",
          "nameEn": "פירות",
          "parentId": "dept/פירות-וירקות",
          "chainHints": {
            "ramiLevy": [
              "196"
            ]
          },
          "children": [
            {
              "id": "dept/פירות-וירקות/פירות/פירות-טריים",
              "nameHe": "פירות טריים",
              "nameEn": "פירות טריים",
              "parentId": "dept/פירות-וירקות/פירות",
              "chainHints": {
                "ramiLevy": [
                  "322"
                ],
                "shufersal": [
                  "A041002",
                  "A510102",
                  "A500701"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/פירות/ירקות-ארוזים",
              "nameHe": "ירקות ארוזים",
              "nameEn": "ירקות ארוזים",
              "parentId": "dept/פירות-וירקות/פירות",
              "chainHints": {
                "ramiLevy": [
                  "386"
                ],
                "shufersal": [
                  "A100804",
                  "A040901",
                  "A040811",
                  "A041004",
                  "A041003",
                  "A040903",
                  "A100801",
                  "A281701"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פירות-וירקות/ירקות",
          "nameHe": "ירקות",
          "nameEn": "ירקות",
          "parentId": "dept/פירות-וירקות",
          "chainHints": {
            "ramiLevy": [
              "197"
            ]
          },
          "children": [
            {
              "id": "dept/פירות-וירקות/ירקות/ירקות-טריים",
              "nameHe": "ירקות טריים",
              "nameEn": "ירקות טריים",
              "parentId": "dept/פירות-וירקות/ירקות",
              "chainHints": {
                "ramiLevy": [
                  "320"
                ],
                "shufersal": [
                  "A041001",
                  "A040901",
                  "A041002",
                  "A040904"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/ירקות/פירות-טריים",
              "nameHe": "פירות טריים",
              "nameEn": "פירות טריים",
              "parentId": "dept/פירות-וירקות/ירקות",
              "chainHints": {
                "ramiLevy": [
                  "322"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/ירקות/ירקות-ארוזים",
              "nameHe": "ירקות ארוזים",
              "nameEn": "ירקות ארוזים",
              "parentId": "dept/פירות-וירקות/ירקות",
              "chainHints": {
                "ramiLevy": [
                  "386"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/ירקות/עשבי-תיבול",
              "nameHe": "עשבי תיבול",
              "nameEn": "עשבי תיבול",
              "parentId": "dept/פירות-וירקות/ירקות",
              "chainHints": {
                "ramiLevy": [
                  "607"
                ],
                "shufersal": [
                  "A040901",
                  "A040902",
                  "A041001"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פירות-וירקות/פירות-יבשים",
          "nameHe": "פירות יבשים",
          "nameEn": "פירות יבשים",
          "parentId": "dept/פירות-וירקות",
          "chainHints": {
            "ramiLevy": [
              "199"
            ]
          },
          "children": [
            {
              "id": "dept/פירות-וירקות/פירות-יבשים/פירות-יבשים",
              "nameHe": "פיצוחים טבעיים",
              "nameEn": "פיצוחים טבעיים",
              "parentId": "dept/פירות-וירקות/פירות-יבשים",
              "chainHints": {
                "ramiLevy": [
                  "321"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/פירות-יבשים/פירות-יבשים-סיטונאות",
              "nameHe": "פירות יבשים סיטונאות",
              "nameEn": "פירות יבשים סיטונאות",
              "parentId": "dept/פירות-וירקות/פירות-יבשים",
              "chainHints": {
                "ramiLevy": [
                  "1003"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/פירות-יבשים/פירות-יבשים-1",
              "nameHe": "פירות יבשים",
              "nameEn": "פירות יבשים",
              "parentId": "dept/פירות-וירקות/פירות-יבשים",
              "chainHints": {
                "ramiLevy": [
                  "1156"
                ],
                "shufersal": [
                  "A281707"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פירות-וירקות/פיצוחים",
          "nameHe": "פיצוחים ופירות יבשים",
          "nameEn": "פיצוחים ופירות יבשים",
          "parentId": "dept/פירות-וירקות",
          "chainHints": {
            "ramiLevy": [
              "279"
            ]
          },
          "children": [
            {
              "id": "dept/פירות-וירקות/פיצוחים/פירות-יבשים",
              "nameHe": "פיצוחים טבעיים",
              "nameEn": "פיצוחים טבעיים",
              "parentId": "dept/פירות-וירקות/פיצוחים",
              "chainHints": {
                "ramiLevy": [
                  "321"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/פיצוחים/פיצוחים",
              "nameHe": "פיצוחים",
              "nameEn": "פיצוחים",
              "parentId": "dept/פירות-וירקות/פיצוחים",
              "chainHints": {
                "ramiLevy": [
                  "449"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/פיצוחים/פירות-יבשים-1",
              "nameHe": "פירות יבשים",
              "nameEn": "פירות יבשים",
              "parentId": "dept/פירות-וירקות/פיצוחים",
              "chainHints": {
                "ramiLevy": [
                  "1156"
                ],
                "shufersal": [
                  "A040201",
                  "A040204",
                  "A040207",
                  "A040202",
                  "A040213",
                  "A040210",
                  "A281707"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/פיצוחים/מנצ-ס",
              "nameHe": "מנצ'ס",
              "nameEn": "מנצ'ס",
              "parentId": "dept/פירות-וירקות/פיצוחים",
              "chainHints": {
                "ramiLevy": [
                  "1157"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פירות-וירקות/פיצוחים/פיצוחים-קלויים",
              "nameHe": "פיצוחים קלויים",
              "nameEn": "פיצוחים קלויים",
              "parentId": "dept/פירות-וירקות/פיצוחים",
              "chainHints": {
                "ramiLevy": [
                  "1158"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/חלב-ביצים-וסלטים",
      "nameHe": "חלב ביצים וסלטים",
      "nameEn": "חלב ביצים וסלטים",
      "icon": "Milk",
      "chainHints": {
        "ramiLevy": [
          "50"
        ]
      },
      "children": [
        {
          "id": "dept/חלב-ביצים-וסלטים/חלב",
          "nameHe": "חלב",
          "nameEn": "חלב",
          "parentId": "dept/חלב-ביצים-וסלטים",
          "chainHints": {
            "ramiLevy": [
              "198"
            ]
          },
          "children": [
            {
              "id": "dept/חלב-ביצים-וסלטים/חלב/חלב-טרי",
              "nameHe": "חלב טרי",
              "nameEn": "חלב טרי",
              "parentId": "dept/חלב-ביצים-וסלטים/חלב",
              "chainHints": {
                "ramiLevy": [
                  "22"
                ],
                "shufersal": [
                  "A010701"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חלב/חלב-עמיד-ומלבין",
              "nameHe": "חלב עמיד ומלבין",
              "nameEn": "חלב עמיד ומלבין",
              "parentId": "dept/חלב-ביצים-וסלטים/חלב",
              "chainHints": {
                "ramiLevy": [
                  "23"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חלב/משקאות-חלב-ויוגורט",
              "nameHe": "משקאות חלב ויוגורט",
              "nameEn": "משקאות חלב ויוגורט",
              "parentId": "dept/חלב-ביצים-וסלטים/חלב",
              "chainHints": {
                "ramiLevy": [
                  "31"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חלב/משקאות-סויה-וללא-לקטוז",
              "nameHe": "תחליפי חלב",
              "nameEn": "תחליפי חלב",
              "parentId": "dept/חלב-ביצים-וסלטים/חלב",
              "chainHints": {
                "ramiLevy": [
                  "317"
                ],
                "shufersal": [
                  "A011907",
                  "A280501"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חלב/משקאות-חלב",
              "nameHe": "משקאות חלב",
              "nameEn": "משקאות חלב",
              "parentId": "dept/חלב-ביצים-וסלטים/חלב",
              "chainHints": {
                "ramiLevy": [
                  "364"
                ],
                "shufersal": [
                  "A010710",
                  "A010707"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חלב/תחליפי-חלב-מצונן",
              "nameHe": "תחליפי חלב מצונן",
              "nameEn": "תחליפי חלב מצונן",
              "parentId": "dept/חלב-ביצים-וסלטים/חלב",
              "chainHints": {
                "ramiLevy": [
                  "1171"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חלב/משקאות-חלבון-1",
              "nameHe": "משקאות חלבון",
              "nameEn": "משקאות חלבון",
              "parentId": "dept/חלב-ביצים-וסלטים/חלב",
              "chainHints": {
                "ramiLevy": [
                  "1219"
                ],
                "shufersal": [
                  "A011320"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חלב-ביצים-וסלטים/ביצים",
          "nameHe": "ביצים",
          "nameEn": "ביצים",
          "parentId": "dept/חלב-ביצים-וסלטים",
          "chainHints": {
            "ramiLevy": [
              "200"
            ]
          },
          "children": [
            {
              "id": "dept/חלב-ביצים-וסלטים/ביצים/ביצים",
              "nameHe": "ביצים",
              "nameEn": "ביצים",
              "parentId": "dept/חלב-ביצים-וסלטים/ביצים",
              "chainHints": {
                "ramiLevy": [
                  "295"
                ],
                "shufersal": [
                  "A010708"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת",
          "nameHe": "חמאה מרגרינה שמנת",
          "nameEn": "חמאה מרגרינה שמנת",
          "parentId": "dept/חלב-ביצים-וסלטים",
          "chainHints": {
            "ramiLevy": [
              "201"
            ]
          },
          "children": [
            {
              "id": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת/חמאה",
              "nameHe": "חמאה",
              "nameEn": "חמאה",
              "parentId": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת",
              "chainHints": {
                "ramiLevy": [
                  "139"
                ],
                "shufersal": [
                  "A011908",
                  "A011909",
                  "A010714"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת/קצפת-ושמנת",
              "nameHe": "שמנת לבישול ואפיה",
              "nameEn": "שמנת לבישול ואפיה",
              "parentId": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת",
              "chainHints": {
                "ramiLevy": [
                  "242"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת/מרגרינה",
              "nameHe": "מרגרינה",
              "nameEn": "מרגרינה",
              "parentId": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת",
              "chainHints": {
                "ramiLevy": [
                  "577"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת/קצפות",
              "nameHe": "קצפות",
              "nameEn": "קצפות",
              "parentId": "dept/חלב-ביצים-וסלטים/חמאה-מרגרינה-שמנת",
              "chainHints": {
                "ramiLevy": [
                  "859"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חלב-ביצים-וסלטים/גבינות",
          "nameHe": "גבינות",
          "nameEn": "גבינות",
          "parentId": "dept/חלב-ביצים-וסלטים",
          "chainHints": {
            "ramiLevy": [
              "202"
            ]
          },
          "children": [
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/גבינה-מלוחה",
              "nameHe": "גבינה מלוחה",
              "nameEn": "גבינה מלוחה",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "69"
                ],
                "shufersal": [
                  "A010503"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/גבינת-שמנת-מותכת",
              "nameHe": "גבינת שמנת,מותכת",
              "nameEn": "גבינת שמנת,מותכת",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "189"
                ],
                "shufersal": [
                  "A010404"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/גבינת-קוטג",
              "nameHe": "גבינת קוטג'",
              "nameEn": "גבינת קוטג'",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "273"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/גבינה-צהובה",
              "nameHe": "גבינה צהובה",
              "nameEn": "גבינה צהובה",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "339"
                ],
                "shufersal": [
                  "A010501"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/גבינה-קשה",
              "nameHe": "גבינות קשות",
              "nameEn": "גבינות קשות",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "355"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/גבינה-לבנה",
              "nameHe": "גבינה לבנה",
              "nameEn": "גבינה לבנה",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "394"
                ],
                "shufersal": [
                  "A010407",
                  "A010416",
                  "A010401",
                  "A010502"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/גבינות-צאן",
              "nameHe": "גבינות צאן",
              "nameEn": "גבינות צאן",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "574"
                ],
                "shufersal": [
                  "A010413",
                  "A010401",
                  "A010504",
                  "A010407",
                  "A010410"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/לאבנה-וגבינות-רכות",
              "nameHe": "לאבנה וגבינות רכות",
              "nameEn": "לאבנה וגבינות רכות",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "575"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/גבינות/מוצרלה",
              "nameHe": "מוצרלה",
              "nameEn": "מוצרלה",
              "parentId": "dept/חלב-ביצים-וסלטים/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "576"
                ],
                "shufersal": [
                  "A010411"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב",
          "nameHe": "שמנת, יוגורט ומעדנים",
          "nameEn": "שמנת, יוגורט ומעדנים",
          "parentId": "dept/חלב-ביצים-וסלטים",
          "chainHints": {
            "ramiLevy": [
              "203"
            ]
          },
          "children": [
            {
              "id": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב/לבן-ואשל",
              "nameHe": "לבן, אשל ושמנת חמוצה",
              "nameEn": "לבן, אשל ושמנת חמוצה",
              "parentId": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב",
              "chainHints": {
                "ramiLevy": [
                  "28"
                ],
                "shufersal": [
                  "A010715"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב/משקאות-חלב-ויוגורט",
              "nameHe": "יוגורט ומשקאות יוגורט",
              "nameEn": "יוגורט ומשקאות יוגורט",
              "parentId": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב",
              "chainHints": {
                "ramiLevy": [
                  "31"
                ],
                "shufersal": [
                  "A011317",
                  "A280506"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב/יוגורט-לבן-טבעי",
              "nameHe": "יוגורט לבן טבעי",
              "nameEn": "יוגורט לבן טבעי",
              "parentId": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב",
              "chainHints": {
                "ramiLevy": [
                  "374"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב/יוגורט-פרי-טעמים",
              "nameHe": "יוגורט פרי , טעמים",
              "nameEn": "יוגורט פרי , טעמים",
              "parentId": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב",
              "chainHints": {
                "ramiLevy": [
                  "389"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב/יוגורט-דיאט",
              "nameHe": "יוגורט דיאט",
              "nameEn": "יוגורט דיאט",
              "parentId": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב",
              "chainHints": {
                "ramiLevy": [
                  "94"
                ],
                "shufersal": [
                  "A011310",
                  "A011311",
                  "A011304",
                  "A011301",
                  "A011004"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב/מעדני-חלב",
              "nameHe": "מעדני חלב",
              "nameEn": "מעדני חלב",
              "parentId": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב",
              "chainHints": {
                "ramiLevy": [
                  "466",
                  "467"
                ],
                "shufersal": [
                  "A011005",
                  "A011001"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב/יוגורט-מועשר-בחלבון",
              "nameHe": "מעדני חלבון",
              "nameEn": "מעדני חלבון",
              "parentId": "dept/חלב-ביצים-וסלטים/יוגורט-ומעדני-חלב",
              "chainHints": {
                "ramiLevy": [
                  "854"
                ],
                "shufersal": [
                  "A011320",
                  "A011007",
                  "A360101"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חלב-ביצים-וסלטים/סלטים",
          "nameHe": "סלטים",
          "nameEn": "סלטים",
          "parentId": "dept/חלב-ביצים-וסלטים",
          "chainHints": {
            "ramiLevy": [
              "204"
            ]
          },
          "children": [
            {
              "id": "dept/חלב-ביצים-וסלטים/סלטים/סלטי-חומוס",
              "nameHe": "סלטי חומוס",
              "nameEn": "סלטי חומוס",
              "parentId": "dept/חלב-ביצים-וסלטים/סלטים",
              "chainHints": {
                "ramiLevy": [
                  "341"
                ],
                "shufersal": [
                  "A162406",
                  "A162404"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/סלטים/סלטי-טחינה",
              "nameHe": "סלטי טחינה",
              "nameEn": "סלטי טחינה",
              "parentId": "dept/חלב-ביצים-וסלטים/סלטים",
              "chainHints": {
                "ramiLevy": [
                  "579"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/סלטים/סלטי-חצילים",
              "nameHe": "סלטי חצילים",
              "nameEn": "סלטי חצילים",
              "parentId": "dept/חלב-ביצים-וסלטים/סלטים",
              "chainHints": {
                "ramiLevy": [
                  "283"
                ],
                "shufersal": [
                  "A162403"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/סלטים/סלטי-ירקות",
              "nameHe": "סלטי ירקות וביצים",
              "nameEn": "סלטי ירקות וביצים",
              "parentId": "dept/חלב-ביצים-וסלטים/סלטים",
              "chainHints": {
                "ramiLevy": [
                  "77"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/סלטים/סלטי-דגים",
              "nameHe": "סלטי דגים",
              "nameEn": "סלטי דגים",
              "parentId": "dept/חלב-ביצים-וסלטים/סלטים",
              "chainHints": {
                "ramiLevy": [
                  "250"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/סלטים/ממרחים-ומתבלים-מצוננים",
              "nameHe": "ממרחים ומתבלים מצוננים",
              "nameEn": "ממרחים ומתבלים מצוננים",
              "parentId": "dept/חלב-ביצים-וסלטים/סלטים",
              "chainHints": {
                "ramiLevy": [
                  "578"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/סלטים/סלטי-כרוב",
              "nameHe": "סלטי כרוב",
              "nameEn": "סלטי כרוב",
              "parentId": "dept/חלב-ביצים-וסלטים/סלטים",
              "chainHints": {
                "ramiLevy": [
                  "580"
                ],
                "shufersal": [
                  "A162404"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/סלטים/אריסה-וסחוג",
              "nameHe": "אריסה וסחוג",
              "nameEn": "אריסה וסחוג",
              "parentId": "dept/חלב-ביצים-וסלטים/סלטים",
              "chainHints": {
                "ramiLevy": [
                  "1178"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חלב-ביצים-וסלטים/מזון-מצונן",
          "nameHe": "מזון מצונן",
          "nameEn": "מזון מצונן",
          "parentId": "dept/חלב-ביצים-וסלטים",
          "chainHints": {
            "ramiLevy": [
              "498"
            ]
          },
          "children": [
            {
              "id": "dept/חלב-ביצים-וסלטים/מזון-מצונן/קינוחים",
              "nameHe": "קינוחים ועוגות מצוננות",
              "nameEn": "קינוחים ועוגות מצוננות",
              "parentId": "dept/חלב-ביצים-וסלטים/מזון-מצונן",
              "chainHints": {
                "ramiLevy": [
                  "228"
                ],
                "shufersal": [
                  "A161706",
                  "A011006"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/מזון-מצונן/פסטה-ומזון-מצונן",
              "nameHe": "פסטה טרייה",
              "nameEn": "פסטה טרייה",
              "parentId": "dept/חלב-ביצים-וסלטים/מזון-מצונן",
              "chainHints": {
                "ramiLevy": [
                  "381"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חלב-ביצים-וסלטים/מזון-מצונן/בצקים-טריים",
              "nameHe": "בצקים טריים",
              "nameEn": "בצקים טריים",
              "parentId": "dept/חלב-ביצים-וסלטים/מזון-מצונן",
              "chainHints": {
                "ramiLevy": [
                  "860"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/בשר-ודגים",
      "nameHe": "בשר  ודגים",
      "nameEn": "בשר  ודגים",
      "icon": "Beef",
      "chainHints": {
        "ramiLevy": [
          "51"
        ]
      },
      "children": [
        {
          "id": "dept/בשר-ודגים/בשר-קפוא",
          "nameHe": "בשר קפוא",
          "nameEn": "בשר קפוא",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "207"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/בשר-קפוא/בשר-קפוא",
              "nameHe": "בשר קפוא",
              "nameEn": "בשר קפוא",
              "parentId": "dept/בשר-ודגים/בשר-קפוא",
              "chainHints": {
                "ramiLevy": [
                  "54"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/בשר-קפוא/בשר-טחון-קפוא",
              "nameHe": "בשר טחון קפוא",
              "nameEn": "בשר טחון קפוא",
              "parentId": "dept/בשר-ודגים/בשר-קפוא",
              "chainHints": {
                "ramiLevy": [
                  "461"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/בשר-ודגים/בשרים-על-האש",
          "nameHe": "בשרים על האש",
          "nameEn": "בשרים על האש",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "206"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/בשרים-על-האש/המבורגר",
              "nameHe": "המבורגר",
              "nameEn": "המבורגר",
              "parentId": "dept/בשר-ודגים/בשרים-על-האש",
              "chainHints": {
                "ramiLevy": [
                  "67"
                ],
                "shufersal": [
                  "A071107",
                  "A071101",
                  "A071108",
                  "A072003"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/בשרים-על-האש/שיפודים-וסטייקים",
              "nameHe": "שיפודים וסטייקים",
              "nameEn": "שיפודים וסטייקים",
              "parentId": "dept/בשר-ודגים/בשרים-על-האש",
              "chainHints": {
                "ramiLevy": [
                  "81"
                ],
                "shufersal": [
                  "A071102"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/בשרים-על-האש/קבב",
              "nameHe": "קבב",
              "nameEn": "קבב",
              "parentId": "dept/בשר-ודגים/בשרים-על-האש",
              "chainHints": {
                "ramiLevy": [
                  "585"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/בשר-ודגים/דגים",
          "nameHe": "דגים",
          "nameEn": "דגים",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "209"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/דגים/דגים-קפואים",
              "nameHe": "דגים קפואים",
              "nameEn": "דגים קפואים",
              "parentId": "dept/בשר-ודגים/דגים",
              "chainHints": {
                "ramiLevy": [
                  "318"
                ],
                "shufersal": [
                  "A070501",
                  "A071710",
                  "A162607",
                  "A162202",
                  "A160307",
                  "A070504"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/דגים/דגים-טריים",
              "nameHe": "דגים טריים",
              "nameEn": "דגים טריים",
              "parentId": "dept/בשר-ודגים/דגים",
              "chainHints": {
                "ramiLevy": [
                  "837"
                ],
                "shufersal": [
                  "A071419"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/בשר-ודגים/נקניקיות-ונקניקים",
          "nameHe": "נקניקים ונקניקיות",
          "nameEn": "נקניקים ונקניקיות",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "210"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/נקניקיות-ונקניקים/קבנוס",
              "nameHe": "קבנוס",
              "nameEn": "קבנוס",
              "parentId": "dept/בשר-ודגים/נקניקיות-ונקניקים",
              "chainHints": {
                "ramiLevy": [
                  "110"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/נקניקיות-ונקניקים/נקניקיות",
              "nameHe": "נקניקיות",
              "nameEn": "נקניקיות",
              "parentId": "dept/בשר-ודגים/נקניקיות-ונקניקים",
              "chainHints": {
                "ramiLevy": [
                  "229"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/נקניקיות-ונקניקים/נקניק",
              "nameHe": "נקניק",
              "nameEn": "נקניק",
              "parentId": "dept/בשר-ודגים/נקניקיות-ונקניקים",
              "chainHints": {
                "ramiLevy": [
                  "288"
                ],
                "shufersal": [
                  "A162601",
                  "A162603"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/נקניקיות-ונקניקים/פסטרמה",
              "nameHe": "פסטרמה",
              "nameEn": "פסטרמה",
              "parentId": "dept/בשר-ודגים/נקניקיות-ונקניקים",
              "chainHints": {
                "ramiLevy": [
                  "377"
                ],
                "shufersal": [
                  "A162605"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/בשר-ודגים/עוף-קפוא",
          "nameHe": "עוף קפוא",
          "nameEn": "עוף קפוא",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "211"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/עוף-קפוא/עוף-קפוא",
              "nameHe": "עוף קפוא",
              "nameEn": "עוף קפוא",
              "parentId": "dept/בשר-ודגים/עוף-קפוא",
              "chainHints": {
                "ramiLevy": [
                  "261"
                ],
                "shufersal": [
                  "A071404",
                  "A160301",
                  "A160302",
                  "A072003",
                  "A072002"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/עוף-קפוא/עוף-קפוא-טחון",
              "nameHe": "עוף קפוא טחון",
              "nameEn": "עוף קפוא טחון",
              "parentId": "dept/בשר-ודגים/עוף-קפוא",
              "chainHints": {
                "ramiLevy": [
                  "768"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/עוף-קפוא/עוף-קפוא-מהדרין",
              "nameHe": "עוף קפוא - כשרויות מיוחדות",
              "nameEn": "עוף קפוא - כשרויות מיוחדות",
              "parentId": "dept/בשר-ודגים/עוף-קפוא",
              "chainHints": {
                "ramiLevy": [
                  "429"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/עוף-קפוא/עוף-קפוא-כשרות-רובין",
              "nameHe": "עוף קפוא כשרות רובין",
              "nameEn": "עוף קפוא כשרות רובין",
              "parentId": "dept/בשר-ודגים/עוף-קפוא",
              "chainHints": {
                "ramiLevy": [
                  "1179"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/בשר-ודגים/אוכל-מוכן",
          "nameHe": "אוכל להכנה מהירה",
          "nameEn": "אוכל להכנה מהירה",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "221"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/אוכל-מוכן/מוצרי-בשר-ועוף-מוכנים",
              "nameHe": "מוצרי בשר ועוף מוכנים",
              "nameEn": "מוצרי בשר ועוף מוכנים",
              "parentId": "dept/בשר-ודגים/אוכל-מוכן",
              "chainHints": {
                "ramiLevy": [
                  "462"
                ],
                "shufersal": [
                  "A071707",
                  "A071704"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/נקניקיות-ונקניקים/ארוחה-מוכנה-מצוננת",
              "nameHe": "ארוחות מצוננות",
              "nameEn": "ארוחות מצוננות",
              "parentId": "dept/בשר-ודגים/אוכל-מוכן",
              "chainHints": {
                "ramiLevy": [
                  "1218"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/בשר-ודגים/עוף-טרי",
          "nameHe": "עוף טרי",
          "nameEn": "עוף טרי",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "278"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/עוף-טרי/עוף-טרי-איכותי",
              "nameHe": "עוף טרי איכותי",
              "nameEn": "עוף טרי איכותי",
              "parentId": "dept/בשר-ודגים/עוף-טרי",
              "chainHints": {
                "ramiLevy": [
                  "66",
                  "853"
                ],
                "shufersal": [
                  "A071422",
                  "A071418",
                  "G170104"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/עוף-טרי/עוף-טרי-ארוז",
              "nameHe": "עוף טרי ארוז",
              "nameEn": "עוף טרי ארוז",
              "parentId": "dept/בשר-ודגים/עוף-טרי",
              "chainHints": {
                "ramiLevy": [
                  "646",
                  "737"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/עוף-טרי/הודו-טרי-ארוז",
              "nameHe": "הודו טרי ארוז",
              "nameEn": "הודו טרי ארוז",
              "parentId": "dept/בשר-ודגים/עוף-טרי",
              "chainHints": {
                "ramiLevy": [
                  "772"
                ],
                "shufersal": [
                  "A071410"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/עוף-טרי/עוף-והודו-ארוז-כשרויות-מיוחדות",
              "nameHe": "עוף והודו ארוז כשרויות מיוחדות",
              "nameEn": "עוף והודו ארוז כשרויות מיוחדות",
              "parentId": "dept/בשר-ודגים/עוף-טרי",
              "chainHints": {
                "ramiLevy": [
                  "767",
                  "929",
                  "1180"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/בשר-ודגים/בשר-בקר-וכבש-טרי",
          "nameHe": "בשר בקר וכבש טרי",
          "nameEn": "בשר בקר וכבש טרי",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "298"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/בשר-בקר-וכבש-טרי/בשר-טרי-איכותי",
              "nameHe": "בשר טרי איכותי",
              "nameEn": "בשר טרי איכותי",
              "parentId": "dept/בשר-ודגים/בשר-בקר-וכבש-טרי",
              "chainHints": {
                "ramiLevy": [
                  "91"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/בשר-בקר-וכבש-טרי/בשר-טרי-פרימיום",
              "nameHe": "בשר טרי פרימיום ארוז",
              "nameEn": "בשר טרי פרימיום ארוז",
              "parentId": "dept/בשר-ודגים/בשר-בקר-וכבש-טרי",
              "chainHints": {
                "ramiLevy": [
                  "842"
                ],
                "shufersal": [
                  "A070201"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/בשר-בקר-וכבש-טרי/בשר-על-עצם",
              "nameHe": "בשר על עצם",
              "nameEn": "בשר על עצם",
              "parentId": "dept/בשר-ודגים/בשר-בקר-וכבש-טרי",
              "chainHints": {
                "ramiLevy": [
                  "845"
                ],
                "shufersal": [
                  "A070201"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/בשר-ודגים/תחליפי-בשר-קפואים",
          "nameHe": "תחליפי בשר קפואים",
          "nameEn": "תחליפי בשר קפואים",
          "parentId": "dept/בשר-ודגים",
          "chainHints": {
            "ramiLevy": [
              "304"
            ]
          },
          "children": [
            {
              "id": "dept/בשר-ודגים/תחליפי-בשר-קפואים/קציצות-ונקניקיות-טבע",
              "nameHe": "נקניקיות מן הצומח",
              "nameEn": "נקניקיות מן הצומח",
              "parentId": "dept/בשר-ודגים/תחליפי-בשר-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "613"
                ],
                "shufersal": [
                  "A070705",
                  "A070702",
                  "A070701",
                  "A070704",
                  "A070703",
                  "F110301"
                ]
              },
              "children": []
            },
            {
              "id": "dept/בשר-ודגים/תחליפי-בשר-קפואים/תחליפי-בשר-קפואים",
              "nameHe": "תחליפי בשר",
              "nameEn": "תחליפי בשר",
              "parentId": "dept/בשר-ודגים/תחליפי-בשר-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "1052"
                ],
                "shufersal": [
                  "A282004"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/לחם-מאפים-והמאפייה-הטריה",
      "nameHe": "לחמים ומוצרי מאפה",
      "nameEn": "לחמים ומוצרי מאפה",
      "icon": "Croissant",
      "chainHints": {
        "ramiLevy": [
          "61"
        ]
      },
      "children": [
        {
          "id": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה",
          "nameHe": "לחם, פיתה, לחמניה",
          "nameEn": "לחם, פיתה, לחמניה",
          "parentId": "dept/לחם-מאפים-והמאפייה-הטריה",
          "chainHints": {
            "ramiLevy": [
              "195"
            ]
          },
          "children": [
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה/לחמים",
              "nameHe": "לחמים",
              "nameEn": "לחמים",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה",
              "chainHints": {
                "ramiLevy": [
                  "18"
                ],
                "shufersal": [
                  "A100504",
                  "A100507"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה/לחמניות",
              "nameHe": "לחמניות",
              "nameEn": "לחמניות",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה",
              "chainHints": {
                "ramiLevy": [
                  "21"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה/פיתות",
              "nameHe": "פיתות",
              "nameEn": "פיתות",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה",
              "chainHints": {
                "ramiLevy": [
                  "627"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה/חלה-לשבת",
              "nameHe": "חלה לשבת",
              "nameEn": "חלה לשבת",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/לחם-פיתה-לחמניה",
              "chainHints": {
                "ramiLevy": [
                  "473"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח",
          "nameHe": "פריכיות וקרקרים",
          "nameEn": "פריכיות וקרקרים",
          "parentId": "dept/לחם-מאפים-והמאפייה-הטריה",
          "chainHints": {
            "ramiLevy": [
              "272"
            ]
          },
          "children": [
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח/פריכיות",
              "nameHe": "פריכיות",
              "nameEn": "פריכיות",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח",
              "chainHints": {
                "ramiLevy": [
                  "311"
                ],
                "shufersal": [
                  "A100507",
                  "A100207"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח/טורטיות",
              "nameHe": "טורטיות",
              "nameEn": "טורטיות",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח",
              "chainHints": {
                "ramiLevy": [
                  "515"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח/פתית-לחמית-וצנימים",
              "nameHe": "פתית, לחמית וצנימים",
              "nameEn": "פתית, לחמית וצנימים",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח",
              "chainHints": {
                "ramiLevy": [
                  "312"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח/קרקרים",
              "nameHe": "קרקרים",
              "nameEn": "קרקרים",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/מאפה-מלוח",
              "chainHints": {
                "ramiLevy": [
                  "313"
                ],
                "shufersal": [
                  "A100804",
                  "A100801"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום",
          "nameHe": "מאפים טריים",
          "nameEn": "מאפים טריים",
          "parentId": "dept/לחם-מאפים-והמאפייה-הטריה",
          "chainHints": {
            "ramiLevy": [
              "273"
            ]
          },
          "children": [
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום/מאפים-טריים",
              "nameHe": "מאפים, עוגות ועוגיות",
              "nameEn": "מאפים, עוגות ועוגיות",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום",
              "chainHints": {
                "ramiLevy": [
                  "305"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום/מאפים-מלוחים-מתוקים",
              "nameHe": "מאפים מלוחים, מתוקים",
              "nameEn": "מאפים מלוחים, מתוקים",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום",
              "chainHints": {
                "ramiLevy": [
                  "476"
                ],
                "shufersal": [
                  "A220602"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום/לחמי-מאפייה",
              "nameHe": "לחמי המאפייה וחלות",
              "nameEn": "לחמי המאפייה וחלות",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום",
              "chainHints": {
                "ramiLevy": [
                  "586"
                ],
                "shufersal": [
                  "A100501",
                  "A100807"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום/בגטים-ולחמניות",
              "nameHe": "בגטים ולחמניות",
              "nameEn": "בגטים ולחמניות",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום",
              "chainHints": {
                "ramiLevy": [
                  "1174"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום/סופגניות-ודונאטס",
              "nameHe": "סופגניות ודונאטס",
              "nameEn": "סופגניות ודונאטס",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/המאפיה-הטריה-אפיה-במקום",
              "chainHints": {
                "ramiLevy": [
                  "840"
                ],
                "shufersal": [
                  "A100201",
                  "A101603"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/לחם-מאפים-והמאפייה-הטריה/מצות-ומאפים-לפסח",
          "nameHe": "מצות  ומאפים לפסח",
          "nameEn": "מצות  ומאפים לפסח",
          "parentId": "dept/לחם-מאפים-והמאפייה-הטריה",
          "chainHints": {
            "ramiLevy": [
              "280"
            ]
          },
          "children": [
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/מצות-ומאפים-לפסח/מצות",
              "nameHe": "מצות",
              "nameEn": "מצות",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/מצות-ומאפים-לפסח",
              "chainHints": {
                "ramiLevy": [
                  "474"
                ]
              },
              "children": []
            },
            {
              "id": "dept/לחם-מאפים-והמאפייה-הטריה/מצות-ומאפים-לפסח/מאפה-לפסח-מתוק-מלוח",
              "nameHe": "מאפה לפסח מתוק,מלוח",
              "nameEn": "מאפה לפסח מתוק,מלוח",
              "parentId": "dept/לחם-מאפים-והמאפייה-הטריה/מצות-ומאפים-לפסח",
              "chainHints": {
                "ramiLevy": [
                  "475"
                ],
                "shufersal": [
                  "A100204",
                  "A440204",
                  "A100201",
                  "A100208"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/קטניות-ודגנים",
      "nameHe": "קטניות ודגנים",
      "nameEn": "קטניות ודגנים",
      "icon": "Wheat",
      "chainHints": {
        "ramiLevy": [
          "55"
        ]
      },
      "children": [
        {
          "id": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס",
          "nameHe": "פסטה, פתיתים, קוסקוס",
          "nameEn": "פסטה, פתיתים, קוסקוס",
          "parentId": "dept/קטניות-ודגנים",
          "chainHints": {
            "ramiLevy": [
              "230"
            ]
          },
          "children": [
            {
              "id": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס/פסטות",
              "nameHe": "פסטות",
              "nameEn": "פסטות",
              "parentId": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס",
              "chainHints": {
                "ramiLevy": [
                  "190"
                ],
                "shufersal": [
                  "A221110",
                  "A221113"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס/פתיתים",
              "nameHe": "פתיתים",
              "nameEn": "פתיתים",
              "parentId": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס",
              "chainHints": {
                "ramiLevy": [
                  "144"
                ],
                "shufersal": [
                  "A221116"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס/נודלס-ואטריות",
              "nameHe": "נודלס ואטריות",
              "nameEn": "נודלס ואטריות",
              "parentId": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס",
              "chainHints": {
                "ramiLevy": [
                  "174"
                ],
                "shufersal": [
                  "A220603",
                  "A221110"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס/ניוקי-לזניה-קנלוני",
              "nameHe": "ניוקי, לזניה, קנלוני",
              "nameEn": "ניוקי, לזניה, קנלוני",
              "parentId": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס",
              "chainHints": {
                "ramiLevy": [
                  "610"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס/קוסקוס",
              "nameHe": "קוסקוס",
              "nameEn": "קוסקוס",
              "parentId": "dept/קטניות-ודגנים/פסטה-פתיתים-קוסקוס",
              "chainHints": {
                "ramiLevy": [
                  "611"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה",
          "nameHe": "דגנים וחטיפי אנרגיה",
          "nameEn": "דגנים וחטיפי אנרגיה",
          "parentId": "dept/קטניות-ודגנים",
          "chainHints": {
            "ramiLevy": [
              "234"
            ]
          },
          "children": [
            {
              "id": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה/גרנולה-מוזלי-וקוואקר",
              "nameHe": "גרנולה מוזלי וקוואקר",
              "nameEn": "גרנולה מוזלי וקוואקר",
              "parentId": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "340"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה/קורנפלקס",
              "nameHe": "קורנפלקס",
              "nameEn": "קורנפלקס",
              "parentId": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "1212"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה/דגני-ילדים",
              "nameHe": "דגני ילדים",
              "nameEn": "דגני ילדים",
              "parentId": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "350"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה/דגני-מבוגרים",
              "nameHe": "דגני מבוגרים",
              "nameEn": "דגני מבוגרים",
              "parentId": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "432"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה/חטיפי-אנרגיה",
              "nameHe": "חטיפי אנרגיה ובריאות",
              "nameEn": "חטיפי אנרגיה ובריאות",
              "parentId": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "433"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה/חטיף-דגנים-לילדים",
              "nameHe": "חטיף דגנים לילדים",
              "nameEn": "חטיף דגנים לילדים",
              "parentId": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "434"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה/חיטה-תפוחה-ופצפוצי-אורז",
              "nameHe": "שלווה ופצפוצי אורז",
              "nameEn": "שלווה ופצפוצי אורז",
              "parentId": "dept/קטניות-ודגנים/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "738"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/קטניות-ודגנים/אורז-וקטניות",
          "nameHe": "אורז וקטניות",
          "nameEn": "אורז וקטניות",
          "parentId": "dept/קטניות-ודגנים",
          "chainHints": {
            "ramiLevy": [
              "303"
            ]
          },
          "children": [
            {
              "id": "dept/קטניות-ודגנים/אורז-וקטניות/אורז",
              "nameHe": "אורז",
              "nameEn": "אורז",
              "parentId": "dept/קטניות-ודגנים/אורז-וקטניות",
              "chainHints": {
                "ramiLevy": [
                  "202",
                  "994",
                  "1149"
                ],
                "shufersal": [
                  "A221107",
                  "A221101",
                  "A221104",
                  "A221119",
                  "A221113",
                  "A280225"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קטניות-ודגנים/אורז-וקטניות/קטניות",
              "nameHe": "קטניות",
              "nameEn": "קטניות",
              "parentId": "dept/קטניות-ודגנים/אורז-וקטניות",
              "chainHints": {
                "ramiLevy": [
                  "323"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/שימורים-בישול-ואפיה",
      "nameHe": "שימורים בישול ואפיה",
      "nameEn": "שימורים בישול ואפיה",
      "icon": "CookingPot",
      "chainHints": {
        "ramiLevy": [
          "54"
        ]
      },
      "children": [
        {
          "id": "dept/שימורים-בישול-ואפיה/שימורים",
          "nameHe": "שימורים",
          "nameEn": "שימורים",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "225"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/שימורים/שימורי-עגבניות",
              "nameHe": "שימורי עגבניות",
              "nameEn": "שימורי עגבניות",
              "parentId": "dept/שימורים-בישול-ואפיה/שימורים",
              "chainHints": {
                "ramiLevy": [
                  "148",
                  "1010"
                ],
                "shufersal": [
                  "A280213"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שימורים/שימורי-זיתים",
              "nameHe": "שימורי זיתים",
              "nameEn": "שימורי זיתים",
              "parentId": "dept/שימורים-בישול-ואפיה/שימורים",
              "chainHints": {
                "ramiLevy": [
                  "171"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שימורים/שימורי-מלפפונים",
              "nameHe": "שימורי מלפפונים",
              "nameEn": "שימורי מלפפונים",
              "parentId": "dept/שימורים-בישול-ואפיה/שימורים",
              "chainHints": {
                "ramiLevy": [
                  "55"
                ],
                "shufersal": [
                  "A221710",
                  "C050101",
                  "G020305",
                  "G020301",
                  "G020303",
                  "G020304"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שימורים/שימורי-טונה",
              "nameHe": "שימורי טונה",
              "nameEn": "שימורי טונה",
              "parentId": "dept/שימורים-בישול-ואפיה/שימורים",
              "chainHints": {
                "ramiLevy": [
                  "76",
                  "1008"
                ],
                "shufersal": [
                  "A221707",
                  "A221713",
                  "A221704",
                  "A221701",
                  "A221716",
                  "A221419"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שימורים/שימורי-תירס-פטריות",
              "nameHe": "שימורי תירס",
              "nameEn": "שימורי תירס",
              "parentId": "dept/שימורים-בישול-ואפיה/שימורים",
              "chainHints": {
                "ramiLevy": [
                  "199"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שימורים/שימורי-ירקות",
              "nameHe": "שימורי ירקות",
              "nameEn": "שימורי ירקות",
              "parentId": "dept/שימורים-בישול-ואפיה/שימורים",
              "chainHints": {
                "ramiLevy": [
                  "231",
                  "1009",
                  "739",
                  "1112"
                ],
                "shufersal": [
                  "A222007"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שימורים/שימורי-דגים",
              "nameHe": "שימורי דגים",
              "nameEn": "שימורי דגים",
              "parentId": "dept/שימורים-בישול-ואפיה/שימורים",
              "chainHints": {
                "ramiLevy": [
                  "407"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שימורים/שימורי-פירות-ולפתנים",
              "nameHe": "שימורי פירות ולפתנים",
              "nameEn": "שימורי פירות ולפתנים",
              "parentId": "dept/שימורים-בישול-ואפיה/שימורים",
              "chainHints": {
                "ramiLevy": [
                  "131"
                ],
                "shufersal": [
                  "A221719"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/שימורים-בישול-ואפיה/רטבים",
          "nameHe": "רטבים",
          "nameEn": "רטבים",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "226"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/רטבים/קטשופ",
              "nameHe": "קטשופ",
              "nameEn": "קטשופ",
              "parentId": "dept/שימורים-בישול-ואפיה/רטבים",
              "chainHints": {
                "ramiLevy": [
                  "362"
                ],
                "shufersal": [
                  "A220601",
                  "A221413",
                  "A221419"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/רטבים/רטבי-עגבניות",
              "nameHe": "רטבי עגבניות",
              "nameEn": "רטבי עגבניות",
              "parentId": "dept/שימורים-בישול-ואפיה/רטבים",
              "chainHints": {
                "ramiLevy": [
                  "388"
                ],
                "shufersal": [
                  "A222008",
                  "A221701"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/רטבים/מיונז",
              "nameHe": "מיונז",
              "nameEn": "מיונז",
              "parentId": "dept/שימורים-בישול-ואפיה/רטבים",
              "chainHints": {
                "ramiLevy": [
                  "621"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/רטבים/חרדל",
              "nameHe": "חרדל ועמבה",
              "nameEn": "חרדל ועמבה",
              "parentId": "dept/שימורים-בישול-ואפיה/רטבים",
              "chainHints": {
                "ramiLevy": [
                  "405"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/רטבים/רוטב-לסלט",
              "nameHe": "רוטב לסלט",
              "nameEn": "רוטב לסלט",
              "parentId": "dept/שימורים-בישול-ואפיה/רטבים",
              "chainHints": {
                "ramiLevy": [
                  "217"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/רטבים/רוטב-לבישול",
              "nameHe": "רוטב לבישול",
              "nameEn": "רוטב לבישול",
              "parentId": "dept/שימורים-בישול-ואפיה/רטבים",
              "chainHints": {
                "ramiLevy": [
                  "406"
                ],
                "shufersal": [
                  "A220601",
                  "A221407",
                  "G130101",
                  "G140105"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/רטבים/רוטב-סויה",
              "nameHe": "רוטב סויה",
              "nameEn": "רוטב סויה",
              "parentId": "dept/שימורים-בישול-ואפיה/רטבים",
              "chainHints": {
                "ramiLevy": [
                  "209"
                ],
                "shufersal": [
                  "A221416",
                  "A220601"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/רטבים/רוטב-צ-ילי",
              "nameHe": "רוטב צ'ילי",
              "nameEn": "רוטב צ'ילי",
              "parentId": "dept/שימורים-בישול-ואפיה/רטבים",
              "chainHints": {
                "ramiLevy": [
                  "622"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים",
          "nameHe": "מרקים ותבשילים",
          "nameEn": "מרקים ותבשילים",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "229"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים/מרקי-תיבול",
              "nameHe": "מרקי תיבול",
              "nameEn": "מרקי תיבול",
              "parentId": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים",
              "chainHints": {
                "ramiLevy": [
                  "206"
                ],
                "shufersal": [
                  "A220603",
                  "A220810",
                  "A220813",
                  "A220816",
                  "A220807",
                  "A220801"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים/שקדי-מרק-וקרוטונים",
              "nameHe": "שקדי מרק וקרוטונים",
              "nameEn": "שקדי מרק וקרוטונים",
              "parentId": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים",
              "chainHints": {
                "ramiLevy": [
                  "221"
                ],
                "shufersal": [
                  "A220804"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים/תבשילי-אינסטנט",
              "nameHe": "תבשילי אינסטנט ומנה חמה",
              "nameEn": "תבשילי אינסטנט ומנה חמה",
              "parentId": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים",
              "chainHints": {
                "ramiLevy": [
                  "277"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים/מרקי-אינסטנט",
              "nameHe": "מרקי אינסטנט",
              "nameEn": "מרקי אינסטנט",
              "parentId": "dept/שימורים-בישול-ואפיה/מרקים-ותבשילים",
              "chainHints": {
                "ramiLevy": [
                  "370"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/שימורים-בישול-ואפיה/תבלינים",
          "nameHe": "תבלינים",
          "nameEn": "תבלינים",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "231"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/תבלינים/סוכר",
              "nameHe": "סוכר",
              "nameEn": "סוכר",
              "parentId": "dept/שימורים-בישול-ואפיה/תבלינים",
              "chainHints": {
                "ramiLevy": [
                  "276"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/תבלינים/מלח",
              "nameHe": "מלח",
              "nameEn": "מלח",
              "parentId": "dept/שימורים-בישול-ואפיה/תבלינים",
              "chainHints": {
                "ramiLevy": [
                  "624"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/תבלינים/פלפל",
              "nameHe": "פלפל",
              "nameEn": "פלפל",
              "parentId": "dept/שימורים-בישול-ואפיה/תבלינים",
              "chainHints": {
                "ramiLevy": [
                  "625"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/תבלינים/פפריקה",
              "nameHe": "פפריקה",
              "nameEn": "פפריקה",
              "parentId": "dept/שימורים-בישול-ואפיה/תבלינים",
              "chainHints": {
                "ramiLevy": [
                  "626"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/תבלינים/תבלינים-בשקית-במיכל",
              "nameHe": "תבלינים בשקית",
              "nameEn": "תבלינים בשקית",
              "parentId": "dept/שימורים-בישול-ואפיה/תבלינים",
              "chainHints": {
                "ramiLevy": [
                  "354"
                ],
                "shufersal": [
                  "A222316"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/תבלינים/תיבולים-למזון",
              "nameHe": "תיבולים למזון",
              "nameEn": "תיבולים למזון",
              "parentId": "dept/שימורים-בישול-ואפיה/תבלינים",
              "chainHints": {
                "ramiLevy": [
                  "460"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/תבלינים/תבלינים-במשקל",
              "nameHe": "תבלינים במשקל",
              "nameEn": "תבלינים במשקל",
              "parentId": "dept/שימורים-בישול-ואפיה/תבלינים",
              "chainHints": {
                "ramiLevy": [
                  "790"
                ],
                "shufersal": [
                  "A222317"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/תבלינים/תבלינים-במיכל",
              "nameHe": "תבלינים במיכל",
              "nameEn": "תבלינים במיכל",
              "parentId": "dept/שימורים-בישול-ואפיה/תבלינים",
              "chainHints": {
                "ramiLevy": [
                  "1074"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
          "nameHe": "דבש, ריבה וממרחים",
          "nameEn": "דבש, ריבה וממרחים",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "264"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים/ריבות-וקונפיטורה",
              "nameHe": "ריבות וקונפיטורה",
              "nameEn": "ריבות וקונפיטורה",
              "parentId": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
              "chainHints": {
                "ramiLevy": [
                  "60"
                ],
                "shufersal": [
                  "A220201",
                  "A220210",
                  "A220207",
                  "A220204",
                  "A221404"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים/דבש",
              "nameHe": "דבש",
              "nameEn": "דבש",
              "parentId": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
              "chainHints": {
                "ramiLevy": [
                  "252"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים/חלבה",
              "nameHe": "חלבה",
              "nameEn": "חלבה",
              "parentId": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
              "chainHints": {
                "ramiLevy": [
                  "404"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים/טחינה-גולמית",
              "nameHe": "טחינה גולמית",
              "nameEn": "טחינה גולמית",
              "parentId": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
              "chainHints": {
                "ramiLevy": [
                  "411"
                ],
                "shufersal": [
                  "A221404"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים/סילאן",
              "nameHe": "סילאן",
              "nameEn": "סילאן",
              "parentId": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
              "chainHints": {
                "ramiLevy": [
                  "619"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים/ממרחי-שוקולד",
              "nameHe": "ממרחי שוקולד",
              "nameEn": "ממרחי שוקולד",
              "parentId": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
              "chainHints": {
                "ramiLevy": [
                  "630"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים/חמאת-בוטנים",
              "nameHe": "חמאת בוטנים",
              "nameEn": "חמאת בוטנים",
              "parentId": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
              "chainHints": {
                "ramiLevy": [
                  "743"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים/ממרחים-שונים",
              "nameHe": "ממרחים שונים",
              "nameEn": "ממרחים שונים",
              "parentId": "dept/שימורים-בישול-ואפיה/דבש-ריבה-וממרחים",
              "chainHints": {
                "ramiLevy": [
                  "855"
                ],
                "shufersal": [
                  "A222008",
                  "A220207",
                  "A280204"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון",
          "nameHe": "שמן, חומץ ומיץ לימון",
          "nameEn": "שמן, חומץ ומיץ לימון",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "267"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון/שמן-זית",
              "nameHe": "שמן זית",
              "nameEn": "שמן זית",
              "parentId": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון",
              "chainHints": {
                "ramiLevy": [
                  "187"
                ],
                "shufersal": [
                  "A222601",
                  "A280205"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון/שמנים-צמחיים",
              "nameHe": "שמנים צמחיים",
              "nameEn": "שמנים צמחיים",
              "parentId": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון",
              "chainHints": {
                "ramiLevy": [
                  "253"
                ],
                "shufersal": [
                  "A222602",
                  "A222604",
                  "A280205"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון/חומץ",
              "nameHe": "חומץ",
              "nameEn": "חומץ",
              "parentId": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון",
              "chainHints": {
                "ramiLevy": [
                  "264"
                ],
                "shufersal": [
                  "A222605",
                  "A280205"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון/שמן-למאור",
              "nameHe": "שמן למאור",
              "nameEn": "שמן למאור",
              "parentId": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון",
              "chainHints": {
                "ramiLevy": [
                  "521"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון/מיץ-לימון",
              "nameHe": "מיץ לימון",
              "nameEn": "מיץ לימון",
              "parentId": "dept/שימורים-בישול-ואפיה/שמן-חומץ-ומיץ-לימון",
              "chainHints": {
                "ramiLevy": [
                  "623"
                ]
              },
              "children": []
            },
          ]
        },
        {
          "id": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה",
          "nameHe": "מוצרי אפיה",
          "nameEn": "מוצרי אפיה",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "275"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה/תערובת-ובסיס-לעוגה-ומאפים",
              "nameHe": "תערובת ובסיס לעוגה ומאפים",
              "nameEn": "תערובת ובסיס לעוגה ומאפים",
              "parentId": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה",
              "chainHints": {
                "ramiLevy": [
                  "105"
                ],
                "shufersal": [
                  "A222310",
                  "A280210"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה/ג-לי-סירופ-פודינג",
              "nameHe": "ג'לי, סירופ, פודינג",
              "nameEn": "ג'לי, סירופ, פודינג",
              "parentId": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה",
              "chainHints": {
                "ramiLevy": [
                  "332"
                ],
                "shufersal": [
                  "A222007",
                  "A220504"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה/עזרי-אפיה",
              "nameHe": "עזרי אפיה",
              "nameEn": "עזרי אפיה",
              "parentId": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה",
              "chainHints": {
                "ramiLevy": [
                  "337"
                ],
                "shufersal": [
                  "A220602",
                  "A220604",
                  "A222001",
                  "A222602",
                  "A222307",
                  "A222304",
                  "A222301",
                  "A222310",
                  "A150101",
                  "A221107",
                  "A221110",
                  "A280213",
                  "A280210",
                  "A500601",
                  "A510101",
                  "G020107",
                  "G020304"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה/קישוטים-לאפיה",
              "nameHe": "קישוטים לאפיה",
              "nameEn": "קישוטים לאפיה",
              "parentId": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה",
              "chainHints": {
                "ramiLevy": [
                  "620"
                ],
                "shufersal": [
                  "A220507",
                  "A220522",
                  "A011908",
                  "A011907",
                  "A011901",
                  "A011904",
                  "A220516",
                  "A220510",
                  "A220501",
                  "A220519"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה/קקאו",
              "nameHe": "קקאו",
              "nameEn": "קקאו",
              "parentId": "dept/שימורים-בישול-ואפיה/מוצרי-אפיה",
              "chainHints": {
                "ramiLevy": [
                  "1163"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/שימורים-בישול-ואפיה/קמח-ופירורי-לחם",
          "nameHe": "קמח ופירורי לחם",
          "nameEn": "קמח ופירורי לחם",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "305"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/קמח-ופירורי-לחם/קמח-וסולת",
              "nameHe": "קמח וסולת",
              "nameEn": "קמח וסולת",
              "parentId": "dept/שימורים-בישול-ואפיה/קמח-ופירורי-לחם",
              "chainHints": {
                "ramiLevy": [
                  "358"
                ]
              },
              "children": []
            },
            {
              "id": "dept/שימורים-בישול-ואפיה/קמח-ופירורי-לחם/פירורי-לחם-ציפוי-לשניצל",
              "nameHe": "פירורי לחם, ציפוי לשניצל",
              "nameEn": "פירורי לחם, ציפוי לשניצל",
              "parentId": "dept/שימורים-בישול-ואפיה/קמח-ופירורי-לחם",
              "chainHints": {
                "ramiLevy": [
                  "379"
                ]
              },
              "children": []
            },
          ]
        },
        {
          "id": "dept/שימורים-בישול-ואפיה/המטבח-האסייאתי",
          "nameHe": "המטבח האסייאתי",
          "nameEn": "המטבח האסייאתי",
          "parentId": "dept/שימורים-בישול-ואפיה",
          "chainHints": {
            "ramiLevy": [
              "306"
            ]
          },
          "children": [
            {
              "id": "dept/שימורים-בישול-ואפיה/המטבח-האסייאתי/המטבח-האסייאתי",
              "nameHe": "המטבח האסייאתי",
              "nameEn": "המטבח האסייאתי",
              "parentId": "dept/שימורים-בישול-ואפיה/המטבח-האסייאתי",
              "chainHints": {
                "ramiLevy": [
                  "360"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/אורגני-ובריאות",
      "nameHe": "אורגני ובריאות",
      "nameEn": "אורגני ובריאות",
      "icon": "Pill",
      "chainHints": {
        "ramiLevy": [
          "52"
        ]
      },
      "children": [
        {
          "id": "dept/אורגני-ובריאות/סויה-וללא-לקטוז",
          "nameHe": "מעדנים ללא לקטוז",
          "nameEn": "מעדנים ללא לקטוז",
          "parentId": "dept/אורגני-ובריאות",
          "chainHints": {
            "ramiLevy": [
              "214"
            ]
          },
          "children": [
            {
              "id": "dept/אורגני-ובריאות/סויה-וללא-לקטוז/מעדנים-ללא-לקטוז",
              "nameHe": "מעדנים ללא לקטוז",
              "nameEn": "מעדנים ללא לקטוז",
              "parentId": "dept/אורגני-ובריאות/סויה-וללא-לקטוז",
              "chainHints": {
                "ramiLevy": [
                  "581"
                ],
                "shufersal": [
                  "A280825",
                  "A250603"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אורגני-ובריאות/נטול-ומופחת-סוכר",
          "nameHe": "נטול ומופחת סוכר",
          "nameEn": "נטול ומופחת סוכר",
          "parentId": "dept/אורגני-ובריאות",
          "chainHints": {
            "ramiLevy": [
              "274"
            ]
          },
          "children": [
            {
              "id": "dept/אורגני-ובריאות/נטול-ומופחת-סוכר/מוצרים-מופחתי-סוכר",
              "nameHe": "מוצרים מופחתי סוכר",
              "nameEn": "מוצרים מופחתי סוכר",
              "parentId": "dept/אורגני-ובריאות/נטול-ומופחת-סוכר",
              "chainHints": {
                "ramiLevy": [
                  "328"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אורגני-ובריאות/נטול-ומופחת-סוכר/ממתיקים",
              "nameHe": "ממתיקים",
              "nameEn": "ממתיקים",
              "parentId": "dept/אורגני-ובריאות/נטול-ומופחת-סוכר",
              "chainHints": {
                "ramiLevy": [
                  "412"
                ],
                "shufersal": [
                  "A280804",
                  "A280807"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אורגני-ובריאות/נטול-ומופחת-סוכר/חטיפים-ומתוקים-מופחתי-סוכר",
              "nameHe": "חטיפים ומתוקים מופחתי סוכר",
              "nameEn": "חטיפים ומתוקים מופחתי סוכר",
              "parentId": "dept/אורגני-ובריאות/נטול-ומופחת-סוכר",
              "chainHints": {
                "ramiLevy": [
                  "771"
                ],
                "shufersal": [
                  "A280307",
                  "A130519",
                  "A280306",
                  "A280301",
                  "A250703",
                  "A280302",
                  "A250702",
                  "A250603"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אורגני-ובריאות/אורגני-וטבעוני",
          "nameHe": "אורגני וטבעוני",
          "nameEn": "אורגני וטבעוני",
          "parentId": "dept/אורגני-ובריאות",
          "chainHints": {
            "ramiLevy": [
              "276"
            ]
          },
          "children": [
            {
              "id": "dept/אורגני-ובריאות/אורגני-וטבעוני/מוצרים-אורגנים",
              "nameHe": "מוצרים אורגנים",
              "nameEn": "מוצרים אורגנים",
              "parentId": "dept/אורגני-ובריאות/אורגני-וטבעוני",
              "chainHints": {
                "ramiLevy": [
                  "349"
                ],
                "shufersal": [
                  "A280216",
                  "A280210",
                  "A370504",
                  "A370210",
                  "A370510",
                  "A370204",
                  "A280507",
                  "A160501",
                  "A282002",
                  "A282010",
                  "A160207",
                  "A160210",
                  "C300101"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אורגני-ובריאות/אורגני-וטבעוני/מוצרים-טבעוניים",
              "nameHe": "מוצרים טבעוניים",
              "nameEn": "מוצרים טבעוניים",
              "parentId": "dept/אורגני-ובריאות/אורגני-וטבעוני",
              "chainHints": {
                "ramiLevy": [
                  "802"
                ],
                "shufersal": [
                  "A280204",
                  "A220501",
                  "A282007",
                  "A282009",
                  "A161109",
                  "A161107"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אורגני-ובריאות/ללא-גלוטן",
          "nameHe": "ללא גלוטן",
          "nameEn": "ללא גלוטן",
          "parentId": "dept/אורגני-ובריאות",
          "chainHints": {
            "ramiLevy": [
              "282"
            ]
          },
          "children": [
            {
              "id": "dept/אורגני-ובריאות/ללא-גלוטן/מוצרים-ללא-גלוטן",
              "nameHe": "מוצרים ללא גלוטן",
              "nameEn": "מוצרים ללא גלוטן",
              "parentId": "dept/אורגני-ובריאות/ללא-גלוטן",
              "chainHints": {
                "ramiLevy": [
                  "507"
                ],
                "shufersal": [
                  "A281413",
                  "A281404",
                  "A281104",
                  "A160807",
                  "A160801",
                  "A101101",
                  "A100508",
                  "A100208",
                  "A281410",
                  "A221119",
                  "A220603",
                  "A222001",
                  "A222310",
                  "A281401",
                  "A250703",
                  "A250804",
                  "A281407",
                  "A160804",
                  "A221113",
                  "A280210",
                  "A101802",
                  "A101803",
                  "A161404",
                  "A280301",
                  "A280804",
                  "A280801",
                  "A280822",
                  "A280810",
                  "A280807",
                  "A280816",
                  "A280813",
                  "A250213",
                  "A161401"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אורגני-ובריאות/מזון-ותוספים-לספורטאים",
          "nameHe": "מזון ותוספים לספורטאים",
          "nameEn": "מזון ותוספים לספורטאים",
          "parentId": "dept/אורגני-ובריאות",
          "chainHints": {
            "ramiLevy": [
              "497"
            ]
          },
          "children": [
            {
              "id": "dept/אורגני-ובריאות/מזון-ותוספים-לספורטאים/חטיפי-חלבון",
              "nameHe": "חטיפי חלבון",
              "nameEn": "חטיפי חלבון",
              "parentId": "dept/אורגני-ובריאות/מזון-ותוספים-לספורטאים",
              "chainHints": {
                "ramiLevy": [
                  "849"
                ],
                "shufersal": [
                  "A250212",
                  "A250104"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אורגני-ובריאות/מזון-ותוספים-לספורטאים/ויטמנים-1",
              "nameHe": "ויטמנים",
              "nameEn": "ויטמנים",
              "parentId": "dept/אורגני-ובריאות/מזון-ותוספים-לספורטאים",
              "chainHints": {
                "ramiLevy": [
                  "1167"
                ],
                "shufersal": [
                  "A380110"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אורגני-ובריאות/מזון-ותוספים-לספורטאים/אבקות-חלבון",
              "nameHe": "אבקות חלבון",
              "nameEn": "אבקות חלבון",
              "parentId": "dept/אורגני-ובריאות/מזון-ותוספים-לספורטאים",
              "chainHints": {
                "ramiLevy": [
                  "1168"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אורגני-ובריאות/תחליפי-גבינה-וטופו",
          "nameHe": "תחליפי גבינה וטופו",
          "nameEn": "תחליפי גבינה וטופו",
          "parentId": "dept/אורגני-ובריאות",
          "chainHints": {
            "ramiLevy": [
              "542"
            ]
          },
          "children": [
            {
              "id": "dept/אורגני-ובריאות/תחליפי-גבינה-וטופו/תחליפי-גבינה",
              "nameHe": "תחליפי גבינה",
              "nameEn": "תחליפי גבינה",
              "parentId": "dept/אורגני-ובריאות/תחליפי-גבינה-וטופו",
              "chainHints": {
                "ramiLevy": [
                  "1021"
                ],
                "shufersal": [
                  "A011204",
                  "A011202",
                  "A011201"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אורגני-ובריאות/תחליפי-גבינה-וטופו/טופו",
              "nameHe": "טופו",
              "nameEn": "טופו",
              "parentId": "dept/אורגני-ובריאות/תחליפי-גבינה-וטופו",
              "chainHints": {
                "ramiLevy": [
                  "1051"
                ],
                "shufersal": [
                  "A011201",
                  "A011203",
                  "A011202",
                  "A280307",
                  "A130824",
                  "A280508",
                  "A130816"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/קפואים",
      "nameHe": "קפואים",
      "nameEn": "קפואים",
      "icon": "Snowflake",
      "chainHints": {
        "ramiLevy": [
          "53"
        ]
      },
      "children": [
        {
          "id": "dept/קפואים/בשרים-על-האש",
          "nameHe": "בשרים על האש",
          "nameEn": "בשרים על האש",
          "parentId": "dept/קפואים",
          "chainHints": {
            "ramiLevy": [
              "206"
            ]
          },
          "children": [
            {
              "id": "dept/קפואים/בשרים-על-האש/המבורגר",
              "nameHe": "המבורגר",
              "nameEn": "המבורגר",
              "parentId": "dept/קפואים/בשרים-על-האש",
              "chainHints": {
                "ramiLevy": [
                  "67"
                ],
                "shufersal": [
                  "A160507",
                  "A162407",
                  "A162406",
                  "A100507",
                  "A100804",
                  "A2414",
                  "G030210"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/קפואים/גלידות-וארטיקים",
          "nameHe": "גלידות וארטיקים",
          "nameEn": "גלידות וארטיקים",
          "parentId": "dept/קפואים",
          "chainHints": {
            "ramiLevy": [
              "220"
            ]
          },
          "children": [
            {
              "id": "dept/קפואים/גלידות-וארטיקים/גביעי-גלידה",
              "nameHe": "גביעי גלידה",
              "nameEn": "גביעי גלידה",
              "parentId": "dept/קפואים/גלידות-וארטיקים",
              "chainHints": {
                "ramiLevy": [
                  "423"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/גלידות-וארטיקים/גלידות-אישיות-ומארזים",
              "nameHe": "שלגונים ומאגדות קרטיבים",
              "nameEn": "שלגונים ומאגדות קרטיבים",
              "parentId": "dept/קפואים/גלידות-וארטיקים",
              "chainHints": {
                "ramiLevy": [
                  "616"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/גלידות-וארטיקים/גלידות-ושלגונים",
              "nameHe": "גלידות משפחתיות",
              "nameEn": "גלידות משפחתיות",
              "parentId": "dept/קפואים/גלידות-וארטיקים",
              "chainHints": {
                "ramiLevy": [
                  "831"
                ],
                "shufersal": [
                  "A160207"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/גלידות-וארטיקים/שלוקים",
              "nameHe": "שלוקים",
              "nameEn": "שלוקים",
              "parentId": "dept/קפואים/גלידות-וארטיקים",
              "chainHints": {
                "ramiLevy": [
                  "1128"
                ],
                "shufersal": [
                  "A160201",
                  "A160210",
                  "A160209"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/קפואים/אוכל-מוכן",
          "nameHe": "אוכל להכנה מהירה",
          "nameEn": "אוכל להכנה מהירה",
          "parentId": "dept/קפואים",
          "chainHints": {
            "ramiLevy": [
              "221"
            ]
          },
          "children": [
            {
              "id": "dept/קפואים/אוכל-מוכן/שניצלים-שניצלונים",
              "nameHe": "שניצלים,שניצלונים",
              "nameEn": "שניצלים,שניצלונים",
              "parentId": "dept/קפואים/אוכל-מוכן",
              "chainHints": {
                "ramiLevy": [
                  "258"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/אוכל-מוכן/מוצרי-בשר-ועוף-מוכנים",
              "nameHe": "מוצרי בשר ועוף מוכנים",
              "nameEn": "מוצרי בשר ועוף מוכנים",
              "parentId": "dept/קפואים/אוכל-מוכן",
              "chainHints": {
                "ramiLevy": [
                  "462"
                ],
                "shufersal": [
                  "A161108"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/אוכל-מוכן/אוכל-מוכן-צמחוני",
              "nameHe": "אוכל מוכן צמחוני",
              "nameEn": "אוכל מוכן צמחוני",
              "parentId": "dept/קפואים/אוכל-מוכן",
              "chainHints": {
                "ramiLevy": [
                  "463"
                ],
                "shufersal": [
                  "A162407",
                  "A162403"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/אוכל-מוכן/מוצרי-דגים-מוכנים",
              "nameHe": "מוצרי דגים מוכנים",
              "nameEn": "מוצרי דגים מוכנים",
              "parentId": "dept/קפואים/אוכל-מוכן",
              "chainHints": {
                "ramiLevy": [
                  "612"
                ],
                "shufersal": [
                  "A160807",
                  "A162407"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/אוכל-מוכן/שניצל-טבע",
              "nameHe": "שניצל טבע",
              "nameEn": "שניצל טבע",
              "parentId": "dept/קפואים/אוכל-מוכן",
              "chainHints": {
                "ramiLevy": [
                  "614"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/אוכל-מוכן/אוכל-מוכן",
              "nameHe": "אוכל מוכן",
              "nameEn": "אוכל מוכן",
              "parentId": "dept/קפואים/אוכל-מוכן",
              "chainHints": {
                "ramiLevy": [
                  "780"
                ],
                "shufersal": [
                  "A162802",
                  "A162601",
                  "A162408",
                  "A162805",
                  "A162405",
                  "A162803",
                  "A370501",
                  "A370201"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים",
          "nameHe": "ירקות, פירות וצ'יפס קפואים",
          "nameEn": "ירקות, פירות וצ'יפס קפואים",
          "parentId": "dept/קפואים",
          "chainHints": {
            "ramiLevy": [
              "222"
            ]
          },
          "children": [
            {
              "id": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים/צ-יפס",
              "nameHe": "צ'יפס וטבעות בצל",
              "nameEn": "צ'יפס וטבעות בצל",
              "parentId": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "70"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים/ירקות-קפואים",
              "nameHe": "ירקות קפואים",
              "nameEn": "ירקות קפואים",
              "parentId": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "176"
                ],
                "shufersal": [
                  "A160507",
                  "A160501",
                  "A160510",
                  "A160504"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים/תבלינים-קפואים",
              "nameHe": "תבלינים קפואים",
              "nameEn": "תבלינים קפואים",
              "parentId": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "414"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים/פירות-קפואים",
              "nameHe": "פירות קפואים",
              "nameEn": "פירות קפואים",
              "parentId": "dept/קפואים/ירקות-פירות-וצ-יפס-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "514"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים",
          "nameHe": "פיצות, מאפים ובצקים קפואים",
          "nameEn": "פיצות, מאפים ובצקים קפואים",
          "parentId": "dept/קפואים",
          "chainHints": {
            "ramiLevy": [
              "223"
            ]
          },
          "children": [
            {
              "id": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים/מלווח-וג-חנון",
              "nameHe": "מלווח וג'חנון",
              "nameEn": "מלווח וג'חנון",
              "parentId": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "112"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים/קובה-סיגרים-ופסטלים",
              "nameHe": "קובה,סיגרים ופסטלים",
              "nameEn": "קובה,סיגרים ופסטלים",
              "parentId": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "256"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים/בורקסים",
              "nameHe": "בורקסים",
              "nameEn": "בורקסים",
              "parentId": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "291"
                ],
                "shufersal": [
                  "A160801"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים/פיצות",
              "nameHe": "פיצות",
              "nameEn": "פיצות",
              "parentId": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "333"
                ],
                "shufersal": [
                  "A160804",
                  "A160816"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים/בצק-קפוא",
              "nameHe": "בצק קפוא",
              "nameEn": "בצק קפוא",
              "parentId": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "617"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים/מוצרי-בצק",
              "nameHe": "מוצרי בצק",
              "nameEn": "מוצרי בצק",
              "parentId": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "618"
                ]
              },
              "children": []
            },
            {
              "id": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים/עוגות-מצוננות",
              "nameHe": "עוגות מצוננות",
              "nameEn": "עוגות מצוננות",
              "parentId": "dept/קפואים/פיצות-מאפים-ובצקים-קפואים",
              "chainHints": {
                "ramiLevy": [
                  "629"
                ],
                "shufersal": [
                  "A100213",
                  "A101104"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/חטיפים-ומתוקים",
      "nameHe": "חטיפים ומתוקים",
      "nameEn": "חטיפים ומתוקים",
      "icon": "Package",
      "chainHints": {
        "ramiLevy": [
          "56"
        ]
      },
      "children": [
        {
          "id": "dept/חטיפים-ומתוקים/ממתקים",
          "nameHe": "ממתקים",
          "nameEn": "ממתקים",
          "parentId": "dept/חטיפים-ומתוקים",
          "chainHints": {
            "ramiLevy": [
              "235"
            ]
          },
          "children": [
            {
              "id": "dept/חטיפים-ומתוקים/ממתקים/בונבוניירות-ומארזי-ממתקים",
              "nameHe": "בונבוניירות ומארזי ממתקים",
              "nameEn": "בונבוניירות ומארזי ממתקים",
              "parentId": "dept/חטיפים-ומתוקים/ממתקים",
              "chainHints": {
                "ramiLevy": [
                  "223"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/ממתקים/מרשמלו",
              "nameHe": "מרשמלו",
              "nameEn": "מרשמלו",
              "parentId": "dept/חטיפים-ומתוקים/ממתקים",
              "chainHints": {
                "ramiLevy": [
                  "299"
                ],
                "shufersal": [
                  "A370507",
                  "A370207"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/ממתקים/שוקולד-טבלאות",
              "nameHe": "שוקולד טבלאות",
              "nameEn": "שוקולד טבלאות",
              "parentId": "dept/חטיפים-ומתוקים/ממתקים",
              "chainHints": {
                "ramiLevy": [
                  "347"
                ],
                "shufersal": [
                  "A250507",
                  "A280302"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/ממתקים/שוקולד-פרימיום",
              "nameHe": "שוקולד פרימיום",
              "nameEn": "שוקולד פרימיום",
              "parentId": "dept/חטיפים-ומתוקים/ממתקים",
              "chainHints": {
                "ramiLevy": [
                  "431"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/ממתקים/ממתקים-שונים",
              "nameHe": "ממתקים שונים",
              "nameEn": "ממתקים שונים",
              "parentId": "dept/חטיפים-ומתוקים/ממתקים",
              "chainHints": {
                "ramiLevy": [
                  "593"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/ממתקים/קרמבו",
              "nameHe": "קרמבו",
              "nameEn": "קרמבו",
              "parentId": "dept/חטיפים-ומתוקים/ממתקים",
              "chainHints": {
                "ramiLevy": [
                  "594"
                ],
                "shufersal": [
                  "A250531"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/ממתקים/ממתקי-גומי",
              "nameHe": "ממתקי גומי",
              "nameEn": "ממתקי גומי",
              "parentId": "dept/חטיפים-ומתוקים/ממתקים",
              "chainHints": {
                "ramiLevy": [
                  "769"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/ממתקים/ממרחים-שונים",
              "nameHe": "ממרחים שונים",
              "nameEn": "ממרחים שונים",
              "parentId": "dept/חטיפים-ומתוקים/ממתקים",
              "chainHints": {
                "ramiLevy": [
                  "855"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חטיפים-ומתוקים/חטיפים-מלוחים",
          "nameHe": "חטיפים מלוחים",
          "nameEn": "חטיפים מלוחים",
          "parentId": "dept/חטיפים-ומתוקים",
          "chainHints": {
            "ramiLevy": [
              "236"
            ]
          },
          "children": [
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מלוחים/חטיפי-ילדים",
              "nameHe": "חטיפי ילדים",
              "nameEn": "חטיפי ילדים",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מלוחים",
              "chainHints": {
                "ramiLevy": [
                  "29"
                ],
                "shufersal": [
                  "A250216",
                  "G160803",
                  "G170101",
                  "G180604"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מלוחים/חטיפי-בוטנים",
              "nameHe": "חטיפי בוטנים",
              "nameEn": "חטיפי בוטנים",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מלוחים",
              "chainHints": {
                "ramiLevy": [
                  "57"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מלוחים/בייגלה",
              "nameHe": "בייגלה",
              "nameEn": "בייגלה",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מלוחים",
              "chainHints": {
                "ramiLevy": [
                  "63"
                ],
                "shufersal": [
                  "A250606",
                  "A250603",
                  "A250607",
                  "A250605",
                  "A250104",
                  "A100212"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מלוחים/חטיפי-צ-יפס-ותירס",
              "nameHe": "חטיפי צ'יפס ותירס",
              "nameEn": "חטיפי צ'יפס ותירס",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מלוחים",
              "chainHints": {
                "ramiLevy": [
                  "177"
                ],
                "shufersal": [
                  "A250604"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מלוחים/אובלטים-וגריסיני",
              "nameHe": "אובלטים וגריסיני",
              "nameEn": "אובלטים וגריסיני",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מלוחים",
              "chainHints": {
                "ramiLevy": [
                  "587"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מלוחים/פופקורן",
              "nameHe": "פופקורן",
              "nameEn": "פופקורן",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מלוחים",
              "chainHints": {
                "ramiLevy": [
                  "588"
                ],
                "shufersal": [
                  "A250104",
                  "A250602"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חטיפים-ומתוקים/וופלים-וביסקוויטים",
          "nameHe": "וופלים וביסקוויטים",
          "nameEn": "וופלים וביסקוויטים",
          "parentId": "dept/חטיפים-ומתוקים",
          "chainHints": {
            "ramiLevy": [
              "299"
            ]
          },
          "children": [
            {
              "id": "dept/חטיפים-ומתוקים/וופלים-וביסקוויטים/ביסקוויטים",
              "nameHe": "ביסקוויטים",
              "nameEn": "ביסקוויטים",
              "parentId": "dept/חטיפים-ומתוקים/וופלים-וביסקוויטים",
              "chainHints": {
                "ramiLevy": [
                  "301"
                ],
                "shufersal": [
                  "A250801"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/וופלים-וביסקוויטים/וופל",
              "nameHe": "וופל",
              "nameEn": "וופל",
              "parentId": "dept/חטיפים-ומתוקים/וופלים-וביסקוויטים",
              "chainHints": {
                "ramiLevy": [
                  "303"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
          "nameHe": "חטיפים מתוקים",
          "nameEn": "חטיפים מתוקים",
          "parentId": "dept/חטיפים-ומתוקים",
          "chainHints": {
            "ramiLevy": [
              "300"
            ]
          },
          "children": [
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים/בונבוניירות-ומארזי-ממתקים",
              "nameHe": "בונבוניירות ומארזי ממתקים",
              "nameEn": "בונבוניירות ומארזי ממתקים",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
              "chainHints": {
                "ramiLevy": [
                  "223"
                ],
                "shufersal": [
                  "A250507",
                  "A250610",
                  "A250510",
                  "A250513",
                  "A250501",
                  "A250605",
                  "A250104",
                  "A250803",
                  "A250802",
                  "A250804",
                  "A250606",
                  "A280304",
                  "A250702"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים/חטיף-שוקולד-בודד",
              "nameHe": "חטיף שוקולד בודד",
              "nameEn": "חטיף שוקולד בודד",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
              "chainHints": {
                "ramiLevy": [
                  "430"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים/שוקולד-פרימיום",
              "nameHe": "שוקולד פרימיום",
              "nameEn": "שוקולד פרימיום",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
              "chainHints": {
                "ramiLevy": [
                  "431"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים/אצבעות-ומקלות-שוקולד",
              "nameHe": "אצבעות ומקלות שוקולד",
              "nameEn": "אצבעות ומקלות שוקולד",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
              "chainHints": {
                "ramiLevy": [
                  "589"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים/חטיפי-שוקולד-בשקית",
              "nameHe": "חטיפי שוקולד בשקית",
              "nameEn": "חטיפי שוקולד בשקית",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
              "chainHints": {
                "ramiLevy": [
                  "590"
                ],
                "shufersal": [
                  "A250216",
                  "A250207",
                  "A250201",
                  "A250213",
                  "A250104",
                  "A010707",
                  "A250204"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים/מארזי-חטיפים",
              "nameHe": "חטיפי שוקולד במארז",
              "nameEn": "חטיפי שוקולד במארז",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
              "chainHints": {
                "ramiLevy": [
                  "591"
                ],
                "shufersal": [
                  "A250534",
                  "A040213",
                  "A250104"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים/מטבעות-וכפתורי-שוקולד",
              "nameHe": "מטבעות וכפתורי שוקולד",
              "nameEn": "מטבעות וכפתורי שוקולד",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
              "chainHints": {
                "ramiLevy": [
                  "592"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/חטיפים-מתוקים/ביצי-שוקולד",
              "nameHe": "ביצי שוקולד",
              "nameEn": "ביצי שוקולד",
              "parentId": "dept/חטיפים-ומתוקים/חטיפים-מתוקים",
              "chainHints": {
                "ramiLevy": [
                  "856"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים",
          "nameHe": "סוכריות ומסטיקים",
          "nameEn": "סוכריות ומסטיקים",
          "parentId": "dept/חטיפים-ומתוקים",
          "chainHints": {
            "ramiLevy": [
              "301"
            ]
          },
          "children": [
            {
              "id": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים/סוכריות-שונות",
              "nameHe": "סוכריות",
              "nameEn": "סוכריות",
              "parentId": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים",
              "chainHints": {
                "ramiLevy": [
                  "155"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים/סוכריות-ללא-סוכר",
              "nameHe": "סוכריות ללא סוכר",
              "nameEn": "סוכריות ללא סוכר",
              "parentId": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים",
              "chainHints": {
                "ramiLevy": [
                  "382"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים/סוכריות-טופי-ג-לי-גומי",
              "nameHe": "סוכריות טופי , ג'לי,  גומי",
              "nameEn": "סוכריות טופי , ג'לי,  גומי",
              "parentId": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים",
              "chainHints": {
                "ramiLevy": [
                  "395"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים/סוכריה-על-מקל",
              "nameHe": "סוכריה על מקל",
              "nameEn": "סוכריה על מקל",
              "parentId": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים",
              "chainHints": {
                "ramiLevy": [
                  "595"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים/מסטיק",
              "nameHe": "מסטיק",
              "nameEn": "מסטיק",
              "parentId": "dept/חטיפים-ומתוקים/סוכריות-ומסטיקים",
              "chainHints": {
                "ramiLevy": [
                  "596"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
          "nameHe": "עוגות ועוגיות",
          "nameEn": "עוגות ועוגיות",
          "parentId": "dept/חטיפים-ומתוקים",
          "chainHints": {
            "ramiLevy": [
              "302"
            ]
          },
          "children": [
            {
              "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות/עוגות",
              "nameHe": "עוגות",
              "nameEn": "עוגות",
              "parentId": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
              "chainHints": {
                "ramiLevy": [
                  "306"
                ],
                "shufersal": [
                  "A100210"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות/עוגיות-חמאה",
              "nameHe": "עוגיות חמאה",
              "nameEn": "עוגיות חמאה",
              "parentId": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
              "chainHints": {
                "ramiLevy": [
                  "308"
                ],
                "shufersal": [
                  "A250804",
                  "A250801",
                  "A100212",
                  "A100207",
                  "A250802",
                  "A250803",
                  "A101101",
                  "A250104",
                  "A280304"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות/עוגיות-שונות",
              "nameHe": "עוגיות שונות",
              "nameEn": "עוגיות שונות",
              "parentId": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
              "chainHints": {
                "ramiLevy": [
                  "309"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות/עוגיות-סנדביץ",
              "nameHe": "עוגיות סנדוויץ'",
              "nameEn": "עוגיות סנדוויץ'",
              "parentId": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
              "chainHints": {
                "ramiLevy": [
                  "310"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות/עוגיות-מלוחות",
              "nameHe": "עוגיות מלוחות",
              "nameEn": "עוגיות מלוחות",
              "parentId": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
              "chainHints": {
                "ramiLevy": [
                  "465"
                ],
                "shufersal": [
                  "A250702",
                  "A250703",
                  "A250805",
                  "A250704"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות/עוגיות-שוקוצ-יפס",
              "nameHe": "עוגיות שוקוצ'יפס",
              "nameEn": "עוגיות שוקוצ'יפס",
              "parentId": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
              "chainHints": {
                "ramiLevy": [
                  "599"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות/עוגות-אישיות",
              "nameHe": "עוגות אישיות",
              "nameEn": "עוגות אישיות",
              "parentId": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
              "chainHints": {
                "ramiLevy": [
                  "600"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חטיפים-ומתוקים/עוגות-ועוגיות/עוגיות-ממולאות",
              "nameHe": "עוגיות ממולאות",
              "nameEn": "עוגיות ממולאות",
              "parentId": "dept/חטיפים-ומתוקים/עוגות-ועוגיות",
              "chainHints": {
                "ramiLevy": [
                  "770"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/משקאות",
      "nameHe": "משקאות",
      "nameEn": "משקאות",
      "icon": "CupSoda",
      "chainHints": {
        "ramiLevy": [
          "57"
        ]
      },
      "children": [
        {
          "id": "dept/משקאות/משקאות-קלים",
          "nameHe": "משקאות קלים",
          "nameEn": "משקאות קלים",
          "parentId": "dept/משקאות",
          "chainHints": {
            "ramiLevy": [
              "237"
            ]
          },
          "children": [
            {
              "id": "dept/משקאות/משקאות-קלים/מים-וסודה-בטעמים",
              "nameHe": "מים וסודה בטעמים",
              "nameEn": "מים וסודה בטעמים",
              "parentId": "dept/משקאות/משקאות-קלים",
              "chainHints": {
                "ramiLevy": [
                  "298"
                ],
                "shufersal": [
                  "A130204",
                  "A130201",
                  "A130208",
                  "A130816"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-קלים/משקאות-קלים",
              "nameHe": "משקאות קלים",
              "nameEn": "משקאות קלים",
              "parentId": "dept/משקאות/משקאות-קלים",
              "chainHints": {
                "ramiLevy": [
                  "435"
                ],
                "shufersal": [
                  "A130801",
                  "A130804",
                  "A130824",
                  "A130816",
                  "A130807",
                  "A130810",
                  "A130813",
                  "A130822"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-קלים/משקאות-מוגזים",
              "nameHe": "משקאות מוגזים",
              "nameEn": "משקאות מוגזים",
              "parentId": "dept/משקאות/משקאות-קלים",
              "chainHints": {
                "ramiLevy": [
                  "436"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-קלים/מיצים-טריים",
              "nameHe": "מיץ טבעי ומצונן, נקטר פירות",
              "nameEn": "מיץ טבעי ומצונן, נקטר פירות",
              "parentId": "dept/משקאות/משקאות-קלים",
              "chainHints": {
                "ramiLevy": [
                  "437"
                ],
                "shufersal": [
                  "A130816"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-קלים/משקאות-אישיים",
              "nameHe": "משקאות אישיים",
              "nameEn": "משקאות אישיים",
              "parentId": "dept/משקאות/משקאות-קלים",
              "chainHints": {
                "ramiLevy": [
                  "1148"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/משקאות/משקאות-חמים",
          "nameHe": "משקאות חמים",
          "nameEn": "משקאות חמים",
          "parentId": "dept/משקאות",
          "chainHints": {
            "ramiLevy": [
              "238"
            ]
          },
          "children": [
            {
              "id": "dept/משקאות/משקאות-חמים/קפה-נמס-אבקה",
              "nameHe": "קפה נמס אבקה",
              "nameEn": "קפה נמס אבקה",
              "parentId": "dept/משקאות/משקאות-חמים",
              "chainHints": {
                "ramiLevy": [
                  "363"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-חמים/קפה-שחור",
              "nameHe": "קפה שחור",
              "nameEn": "קפה שחור",
              "parentId": "dept/משקאות/משקאות-חמים",
              "chainHints": {
                "ramiLevy": [
                  "367"
                ],
                "shufersal": [
                  "A130507",
                  "C300101",
                  "G150707"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-חמים/קפה-ואביזרים-למכונה",
              "nameHe": "קפסולות ופולי קפה",
              "nameEn": "קפסולות ופולי קפה",
              "parentId": "dept/משקאות/משקאות-חמים",
              "chainHints": {
                "ramiLevy": [
                  "420"
                ],
                "shufersal": [
                  "A130525",
                  "A130602",
                  "A130606",
                  "C050101",
                  "A130603",
                  "A130605",
                  "G150202"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-חמים/קפה-נמס-מגורען",
              "nameHe": "קפה נמס מגורען",
              "nameEn": "קפה נמס מגורען",
              "parentId": "dept/משקאות/משקאות-חמים",
              "chainHints": {
                "ramiLevy": [
                  "440"
                ],
                "shufersal": [
                  "A130504"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-חמים/אבקת-שוקו-סחלב",
              "nameHe": "אבקת שוקו , סחלב",
              "nameEn": "אבקת שוקו , סחלב",
              "parentId": "dept/משקאות/משקאות-חמים",
              "chainHints": {
                "ramiLevy": [
                  "532"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-חמים/תה-שחור-קלאסי",
              "nameHe": "תה שחור, קלאסי",
              "nameEn": "תה שחור, קלאסי",
              "parentId": "dept/משקאות/משקאות-חמים",
              "chainHints": {
                "ramiLevy": [
                  "777"
                ],
                "shufersal": [
                  "A130510"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-חמים/חליטות",
              "nameHe": "חליטות",
              "nameEn": "חליטות",
              "parentId": "dept/משקאות/משקאות-חמים",
              "chainHints": {
                "ramiLevy": [
                  "778"
                ],
                "shufersal": [
                  "A130513",
                  "A130510",
                  "G150101",
                  "G150102",
                  "G170202",
                  "G030102"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-חמים/קפה-שחור-סיטונאות",
              "nameHe": "קפה שחור סיטונאות",
              "nameEn": "קפה שחור סיטונאות",
              "parentId": "dept/משקאות/משקאות-חמים",
              "chainHints": {
                "ramiLevy": [
                  "1024"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/משקאות/יינות",
          "nameHe": "יינות",
          "nameEn": "יינות",
          "parentId": "dept/משקאות",
          "chainHints": {
            "ramiLevy": [
              "239"
            ]
          },
          "children": [
            {
              "id": "dept/משקאות/יינות/יינות-לבנים",
              "nameHe": "יינות לבנים",
              "nameEn": "יינות לבנים",
              "parentId": "dept/משקאות/יינות",
              "chainHints": {
                "ramiLevy": [
                  "34"
                ],
                "shufersal": [
                  "A132011",
                  "A132009",
                  "A132004",
                  "F050505",
                  "A132012"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/יינות/יינות-אדומים",
              "nameHe": "יינות אדומים",
              "nameEn": "יינות אדומים",
              "parentId": "dept/משקאות/יינות",
              "chainHints": {
                "ramiLevy": [
                  "48"
                ],
                "shufersal": [
                  "A132008"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/יינות/מיץ-ענבים-תירוש",
              "nameHe": "מיץ ענבים- תירוש",
              "nameEn": "מיץ ענבים- תירוש",
              "parentId": "dept/משקאות/יינות",
              "chainHints": {
                "ramiLevy": [
                  "184"
                ],
                "shufersal": [
                  "A132010"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/יינות/יינות-מבעבעים",
              "nameHe": "יינות מבעבעים",
              "nameEn": "יינות מבעבעים",
              "parentId": "dept/משקאות/יינות",
              "chainHints": {
                "ramiLevy": [
                  "421"
                ],
                "shufersal": [
                  "A132001"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/משקאות/אלכוהול-ואנרגיה",
          "nameHe": "אלכוהול ואנרגיה",
          "nameEn": "אלכוהול ואנרגיה",
          "parentId": "dept/משקאות",
          "chainHints": {
            "ramiLevy": [
              "290"
            ]
          },
          "children": [
            {
              "id": "dept/משקאות/אלכוהול-ואנרגיה/בירה-בירה-שחורה",
              "nameHe": "בירות במארז",
              "nameEn": "בירות במארז",
              "parentId": "dept/משקאות/אלכוהול-ואנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "129"
                ],
                "shufersal": [
                  "A131407",
                  "A131404",
                  "A130816"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/אלכוהול-ואנרגיה/משקאות-חריפים",
              "nameHe": "משקאות חריפים",
              "nameEn": "משקאות חריפים",
              "parentId": "dept/משקאות/אלכוהול-ואנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "156"
                ],
                "shufersal": [
                  "A131701",
                  "A131715",
                  "A131707",
                  "A131713",
                  "A132604",
                  "A132601",
                  "A132610",
                  "A131710"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/אלכוהול-ואנרגיה/משקאות-אנרגיה",
              "nameHe": "משקאות אנרגיה",
              "nameEn": "משקאות אנרגיה",
              "parentId": "dept/משקאות/אלכוהול-ואנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "530"
                ],
                "shufersal": [
                  "A131401",
                  "A131411",
                  "A380205"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/אלכוהול-ואנרגיה/בירה-בודד",
              "nameHe": "בירה בודד",
              "nameEn": "בירה בודד",
              "parentId": "dept/משקאות/אלכוהול-ואנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "907"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/משקאות/תרכיזים",
          "nameHe": "תרכיזים",
          "nameEn": "תרכיזים",
          "parentId": "dept/משקאות",
          "chainHints": {
            "ramiLevy": [
              "291"
            ]
          },
          "children": [
            {
              "id": "dept/משקאות/תרכיזים/סירופ-ותרכיזים",
              "nameHe": "סירופ  ותרכיזים",
              "nameEn": "סירופ  ותרכיזים",
              "parentId": "dept/משקאות/תרכיזים",
              "chainHints": {
                "ramiLevy": [
                  "111"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/תרכיזים/סודה-סטרים-ואבזירים",
              "nameHe": "סודה סטרים ואביזרים",
              "nameEn": "סודה סטרים ואביזרים",
              "parentId": "dept/משקאות/תרכיזים",
              "chainHints": {
                "ramiLevy": [
                  "822"
                ],
                "shufersal": [
                  "A130206"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/משקאות/משקאות-במארזים",
          "nameHe": "משקאות במארזים",
          "nameEn": "משקאות במארזים",
          "parentId": "dept/משקאות",
          "chainHints": {
            "ramiLevy": [
              "591"
            ]
          },
          "children": [
            {
              "id": "dept/משקאות/משקאות-במארזים/משקאות-קלים-במארזים",
              "nameHe": "משקאות קלים במארזים",
              "nameEn": "משקאות קלים במארזים",
              "parentId": "dept/משקאות/משקאות-במארזים",
              "chainHints": {
                "ramiLevy": [
                  "1214"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-במארזים/משקאות-מוגזים-במארזים",
              "nameHe": "משקאות מוגזים במארזים",
              "nameEn": "משקאות מוגזים במארזים",
              "parentId": "dept/משקאות/משקאות-במארזים",
              "chainHints": {
                "ramiLevy": [
                  "1215"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/משקאות-במארזים/מים-וסודה-במארזים",
              "nameHe": "מים וסודה במארזים",
              "nameEn": "מים וסודה במארזים",
              "parentId": "dept/משקאות/משקאות-במארזים",
              "chainHints": {
                "ramiLevy": [
                  "1216"
                ],
                "shufersal": [
                  "A130201",
                  "A130208",
                  "A130204",
                  "A130205",
                  "A130207"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/משקאות/תה-וחליטות",
          "nameHe": "תה וחליטות",
          "nameEn": "תה וחליטות",
          "parentId": "dept/משקאות",
          "chainHints": {
            "ramiLevy": [
              "595"
            ]
          },
          "children": [
            {
              "id": "dept/משקאות/תה-וחליטות/תה-ירוק",
              "nameHe": "תה ירוק",
              "nameEn": "תה ירוק",
              "parentId": "dept/משקאות/תה-וחליטות",
              "chainHints": {
                "ramiLevy": [
                  "51"
                ],
                "shufersal": [
                  "A130519"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/תה-וחליטות/תה-שחור-קלאסי",
              "nameHe": "תה שחור, קלאסי",
              "nameEn": "תה שחור, קלאסי",
              "parentId": "dept/משקאות/תה-וחליטות",
              "chainHints": {
                "ramiLevy": [
                  "777"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/תה-וחליטות/חליטות",
              "nameHe": "חליטות",
              "nameEn": "חליטות",
              "parentId": "dept/משקאות/תה-וחליטות",
              "chainHints": {
                "ramiLevy": [
                  "778"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/תה-וחליטות/תה-טעמים",
              "nameHe": "תה טעמים",
              "nameEn": "תה טעמים",
              "parentId": "dept/משקאות/תה-וחליטות",
              "chainHints": {
                "ramiLevy": [
                  "779"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/תה-וחליטות/תה-שחור-בטעמים",
              "nameHe": "תה שחור בטעמים",
              "nameEn": "תה שחור בטעמים",
              "parentId": "dept/משקאות/תה-וחליטות",
              "chainHints": {
                "ramiLevy": [
                  "1140"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/תה-וחליטות/תה-בתפזורת",
              "nameHe": "תה בתפזורת",
              "nameEn": "תה בתפזורת",
              "parentId": "dept/משקאות/תה-וחליטות",
              "chainHints": {
                "ramiLevy": [
                  "1141"
                ]
              },
              "children": []
            },
            {
              "id": "dept/משקאות/תה-וחליטות/חליטות-קרות",
              "nameHe": "חליטות קרות",
              "nameEn": "חליטות קרות",
              "parentId": "dept/משקאות/תה-וחליטות",
              "chainHints": {
                "ramiLevy": [
                  "1176"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/חד-פעמי-ומתכלה",
      "nameHe": "חד-פעמי ומתכלה",
      "nameEn": "חד-פעמי ומתכלה",
      "icon": "Package",
      "chainHints": {
        "ramiLevy": [
          "58"
        ]
      },
      "children": [
        {
          "id": "dept/חד-פעמי-ומתכלה/חד-פעמי",
          "nameHe": "חד פעמי",
          "nameEn": "חד פעמי",
          "parentId": "dept/חד-פעמי-ומתכלה",
          "chainHints": {
            "ramiLevy": [
              "241"
            ]
          },
          "children": [
            {
              "id": "dept/חד-פעמי-ומתכלה/חד-פעמי/סכו-ם-חד-פעמי",
              "nameHe": "סכו\"ם חד-פעמי",
              "nameEn": "סכו\"ם חד-פעמי",
              "parentId": "dept/חד-פעמי-ומתכלה/חד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "95"
                ],
                "shufersal": [
                  "A251003"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/חד-פעמי/מפות-ומפיות-שולחן",
              "nameHe": "מפות ומפיות שולחן",
              "nameEn": "מפות ומפיות שולחן",
              "parentId": "dept/חד-פעמי-ומתכלה/חד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "165"
                ],
                "shufersal": [
                  "A251004",
                  "G141008",
                  "G130109",
                  "G130102"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/חד-פעמי/כוסות-וקשים-חד-פעמי",
              "nameHe": "כוסות וקשים חד פעמי",
              "nameEn": "כוסות וקשים חד פעמי",
              "parentId": "dept/חד-פעמי-ומתכלה/חד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "361"
                ],
                "shufersal": [
                  "A342602",
                  "G130102",
                  "G140203",
                  "G130101"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/חד-פעמי/צלחות-חד-פעמי",
              "nameHe": "צלחות חד פעמי",
              "nameEn": "צלחות חד פעמי",
              "parentId": "dept/חד-פעמי-ומתכלה/חד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "385"
                ],
                "shufersal": [
                  "A251002"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/חד-פעמי/כלי-הגשה-ואחסון-חד-פעמי",
              "nameHe": "כלי הגשה ואחסון חד פעמי",
              "nameEn": "כלי הגשה ואחסון חד פעמי",
              "parentId": "dept/חד-פעמי-ומתכלה/חד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "544"
                ],
                "shufersal": [
                  "C200101",
                  "G130102",
                  "G130101",
                  "G141003",
                  "G140207",
                  "G140105",
                  "G140104",
                  "G140102",
                  "G140101",
                  "G140201",
                  "G140202",
                  "G140209",
                  "G140204",
                  "G140205",
                  "G140206"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/חד-פעמי/אביזרי-נוי-ושטיחים",
              "nameHe": "אביזרי נוי  ושטיחים",
              "nameEn": "אביזרי נוי  ושטיחים",
              "parentId": "dept/חד-פעמי-ומתכלה/חד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "825"
                ],
                "shufersal": [
                  "A370601",
                  "G130103",
                  "G130101",
                  "G150102"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/חד-פעמי/סכו-ם-וששת",
              "nameHe": "סכו\"ם וששת",
              "nameEn": "סכו\"ם וששת",
              "parentId": "dept/חד-פעמי-ומתכלה/חד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "1064"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/חד-פעמי/חד-פעמי-מתכלה",
              "nameHe": "חד-פעמי מתכלה",
              "nameEn": "חד-פעמי מתכלה",
              "parentId": "dept/חד-פעמי-ומתכלה/חד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "1099"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות",
          "nameHe": "עטיפות, שקיות ותבניות",
          "nameEn": "עטיפות, שקיות ותבניות",
          "parentId": "dept/חד-פעמי-ומתכלה",
          "chainHints": {
            "ramiLevy": [
              "242"
            ]
          },
          "children": [
            {
              "id": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות/רדיד-אלומיניום",
              "nameHe": "רדיד אלומיניום",
              "nameEn": "רדיד אלומיניום",
              "parentId": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות",
              "chainHints": {
                "ramiLevy": [
                  "137"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות/שקיות-אשפה-ואחסון",
              "nameHe": "שקיות אשפה ואחסון",
              "nameEn": "שקיות אשפה ואחסון",
              "parentId": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות",
              "chainHints": {
                "ramiLevy": [
                  "181"
                ],
                "shufersal": [
                  "A341704",
                  "A341701",
                  "A290101"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות/תבניות-אפייה",
              "nameHe": "תבניות אפייה",
              "nameEn": "תבניות אפייה",
              "parentId": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות",
              "chainHints": {
                "ramiLevy": [
                  "205"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות/שקיות-למזון",
              "nameHe": "שקיות למזון",
              "nameEn": "שקיות למזון",
              "parentId": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות",
              "chainHints": {
                "ramiLevy": [
                  "233"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות/ניילון-נצמד",
              "nameHe": "ניילון נצמד",
              "nameEn": "ניילון נצמד",
              "parentId": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות",
              "chainHints": {
                "ramiLevy": [
                  "526"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות/נייר-אפיה-ומזון",
              "nameHe": "נייר אפיה ומזון",
              "nameEn": "נייר אפיה ומזון",
              "parentId": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות",
              "chainHints": {
                "ramiLevy": [
                  "546"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות/תבניות-אפיה",
              "nameHe": "תבניות אפיה",
              "nameEn": "תבניות אפיה",
              "parentId": "dept/חד-פעמי-ומתכלה/עטיפות-שקיות-ותבניות",
              "chainHints": {
                "ramiLevy": [
                  "1107"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חד-פעמי-ומתכלה/מוצרי-נייר-וחד-פעמי",
          "nameHe": "מוצרי נייר וחד פעמי",
          "nameEn": "מוצרי נייר וחד פעמי",
          "parentId": "dept/חד-פעמי-ומתכלה",
          "chainHints": {
            "ramiLevy": [
              "263"
            ]
          },
          "children": [
            {
              "id": "dept/חד-פעמי-ומתכלה/מוצרי-נייר-וחד-פעמי/נייר-טואלט",
              "nameHe": "נייר טואלט",
              "nameEn": "נייר טואלט",
              "parentId": "dept/חד-פעמי-ומתכלה/מוצרי-נייר-וחד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "203"
                ],
                "shufersal": [
                  "A342007",
                  "A342008",
                  "A341701",
                  "A312702",
                  "C200101",
                  "G141002",
                  "G140703",
                  "G130303",
                  "A251004",
                  "A342803",
                  "A342804",
                  "A342802",
                  "A342801",
                  "A341710",
                  "G141001",
                  "G141004",
                  "G130403",
                  "G140705",
                  "G140702",
                  "G140701",
                  "G141101",
                  "G141102",
                  "G141103",
                  "G190203"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/מוצרי-נייר-וחד-פעמי/ממחטות",
              "nameHe": "ממחטות",
              "nameEn": "ממחטות",
              "parentId": "dept/חד-פעמי-ומתכלה/מוצרי-נייר-וחד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "247"
                ],
                "shufersal": [
                  "A312610"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/מוצרי-נייר-וחד-פעמי/מגבות-נייר",
              "nameHe": "מגבות נייר",
              "nameEn": "מגבות נייר",
              "parentId": "dept/חד-פעמי-ומתכלה/מוצרי-נייר-וחד-פעמי",
              "chainHints": {
                "ramiLevy": [
                  "545"
                ],
                "shufersal": [
                  "A342001",
                  "G141007",
                  "G130308"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים",
          "nameHe": "נרות וגפרורים",
          "nameEn": "נרות וגפרורים",
          "parentId": "dept/חד-פעמי-ומתכלה",
          "chainHints": {
            "ramiLevy": [
              "277"
            ]
          },
          "children": [
            {
              "id": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים/נרות-שעווה",
              "nameHe": "נרות שעווה",
              "nameEn": "נרות שעווה",
              "parentId": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים",
              "chainHints": {
                "ramiLevy": [
                  "107"
                ],
                "shufersal": [
                  "A342618"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים/גפרורים-ומצתים",
              "nameHe": "גפרורים ומצתים",
              "nameEn": "גפרורים ומצתים",
              "parentId": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים",
              "chainHints": {
                "ramiLevy": [
                  "519"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים/נרות-שמן",
              "nameHe": "נרות שמן",
              "nameEn": "נרות שמן",
              "parentId": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים",
              "chainHints": {
                "ramiLevy": [
                  "520"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים/שמן-למאור",
              "nameHe": "שמן למאור",
              "nameEn": "שמן למאור",
              "parentId": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים",
              "chainHints": {
                "ramiLevy": [
                  "521"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים/חנוכה",
              "nameHe": "חנוכה",
              "nameEn": "חנוכה",
              "parentId": "dept/חד-פעמי-ומתכלה/נרות-וגפרורים",
              "chainHints": {
                "ramiLevy": [
                  "839"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/חד-פעמי-ומתכלה/פיקניק",
          "nameHe": "פיקניק",
          "nameEn": "פיקניק",
          "parentId": "dept/חד-פעמי-ומתכלה",
          "chainHints": {
            "ramiLevy": [
              "281"
            ]
          },
          "children": [
            {
              "id": "dept/חד-פעמי-ומתכלה/פיקניק/שיפודים-פחמים-ומוצרים-נלווים",
              "nameHe": "שיפודים, פחמים  ומוצרים נלווים",
              "nameEn": "שיפודים, פחמים  ומוצרים נלווים",
              "parentId": "dept/חד-פעמי-ומתכלה/פיקניק",
              "chainHints": {
                "ramiLevy": [
                  "477"
                ]
              },
              "children": []
            },
            {
              "id": "dept/חד-פעמי-ומתכלה/פיקניק/כלים-למנגל",
              "nameHe": "כלים למנגל",
              "nameEn": "כלים למנגל",
              "parentId": "dept/חד-פעמי-ומתכלה/פיקניק",
              "chainHints": {
                "ramiLevy": [
                  "547"
                ],
                "shufersal": [
                  "G130101",
                  "G130112",
                  "G141006"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/אחזקת-הבית-ובע-ח",
      "nameHe": "אחזקת הבית ובע\"ח",
      "nameEn": "אחזקת הבית ובע\"ח",
      "icon": "SprayCan",
      "chainHints": {
        "ramiLevy": [
          "59"
        ]
      },
      "children": [
        {
          "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
          "nameHe": "מוצרי ניקיון לבית",
          "nameEn": "מוצרי ניקיון לבית",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "245"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/ניקוי-כללי-ואביזרים-נילווים",
              "nameHe": "חיטוי וניקוי לבית",
              "nameEn": "חיטוי וניקוי לבית",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "27"
                ],
                "shufersal": [
                  "A280903",
                  "A280901",
                  "A280902",
                  "A342302",
                  "A290101",
                  "A340513",
                  "A340518",
                  "A312704",
                  "G150202",
                  "A251005",
                  "G190201",
                  "G190102",
                  "G190103",
                  "G190101",
                  "G190105",
                  "G190104",
                  "G150204"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/ניקוי-אסלה-ואמבטיה",
              "nameHe": "ניקוי אסלה ואמבטיה",
              "nameEn": "ניקוי אסלה ואמבטיה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "62"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/אקונומיקה",
              "nameHe": "אקונומיקה",
              "nameEn": "אקונומיקה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "82"
                ],
                "shufersal": [
                  "A340501"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/הסרת-אבנית",
              "nameHe": "הסרת אבנית",
              "nameEn": "הסרת אבנית",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "193"
                ],
                "shufersal": [
                  "A340504"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/מטליות-למשטח-ולרצפה",
              "nameHe": "מטליות למשטח ולרצפה",
              "nameEn": "מטליות למשטח ולרצפה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "204"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/ניקוי-שטיחים-ורהיטים",
              "nameHe": "ניקוי שטיחים ורהיטים",
              "nameEn": "ניקוי שטיחים ורהיטים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "270"
                ],
                "shufersal": [
                  "A340510",
                  "G130306",
                  "G130408",
                  "G180504",
                  "G180501"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/ניקוי-רצפות",
              "nameHe": "ניקוי רצפות",
              "nameEn": "ניקוי רצפות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "369"
                ],
                "shufersal": [
                  "A340504",
                  "A340513",
                  "A340507",
                  "A340505"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/ניקוי-חלונות",
              "nameHe": "ניקוי חלונות",
              "nameEn": "ניקוי חלונות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "543"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית/מסיר-שומנים",
              "nameHe": "מסיר שומנים",
              "nameEn": "מסיר שומנים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ניקיון-לבית",
              "chainHints": {
                "ramiLevy": [
                  "776"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/ניקוי-כלים",
          "nameHe": "ניקוי כלים",
          "nameEn": "ניקוי כלים",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "246"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ניקוי-כלים/נוזל-כלים-ומשחה",
              "nameHe": "נוזל כלים  ומשחה",
              "nameEn": "נוזל כלים  ומשחה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ניקוי-כלים",
              "chainHints": {
                "ramiLevy": [
                  "121"
                ],
                "shufersal": [
                  "A342305"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ניקוי-כלים/מוצרים-למדיח",
              "nameHe": "מוצרים למדיח",
              "nameEn": "מוצרים למדיח",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ניקוי-כלים",
              "chainHints": {
                "ramiLevy": [
                  "335"
                ],
                "shufersal": [
                  "A342302",
                  "A342303"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
          "nameHe": "מוצרי כביסה",
          "nameEn": "מוצרי כביסה",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "247"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה/מרכך-כביסה",
              "nameHe": "מרכך כביסה",
              "nameEn": "מרכך כביסה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
              "chainHints": {
                "ramiLevy": [
                  "41"
                ],
                "shufersal": [
                  "A340816",
                  "A290101",
                  "G130308",
                  "G190303"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה/מוצרי-כביסה-נלווים",
              "nameHe": "מוצרי כביסה נלווים",
              "nameEn": "מוצרי כביסה נלווים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
              "chainHints": {
                "ramiLevy": [
                  "141"
                ],
                "shufersal": [
                  "A340810"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה/מסיר-כתמים",
              "nameHe": "מסיר כתמים",
              "nameEn": "מסיר כתמים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
              "chainHints": {
                "ramiLevy": [
                  "152"
                ],
                "shufersal": [
                  "A340813"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה/נוזל-לכביסה",
              "nameHe": "נוזל לכביסה",
              "nameEn": "נוזל לכביסה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
              "chainHints": {
                "ramiLevy": [
                  "218"
                ],
                "shufersal": [
                  "A340804"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה/אבקות-כביסה",
              "nameHe": "אבקות כביסה",
              "nameEn": "אבקות כביסה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
              "chainHints": {
                "ramiLevy": [
                  "220"
                ],
                "shufersal": [
                  "A340801"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה/טבליות-קפסולות-לכביסה",
              "nameHe": "טבליות, קפסולות לכביסה",
              "nameEn": "טבליות, קפסולות לכביסה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
              "chainHints": {
                "ramiLevy": [
                  "257"
                ],
                "shufersal": [
                  "A340807"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה/מרכך-כביסה-מרוכז",
              "nameHe": "מרכך כביסה מרוכז",
              "nameEn": "מרכך כביסה מרוכז",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
              "chainHints": {
                "ramiLevy": [
                  "459"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה/כביסכל",
              "nameHe": "כביסכל",
              "nameEn": "כביסכל",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-כביסה",
              "chainHints": {
                "ramiLevy": [
                  "1213"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
          "nameHe": "אביזרי ניקיון",
          "nameEn": "אביזרי ניקיון",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "248"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון/כפפות-מסכות-ואלכוג-ל",
              "nameHe": "כפפות מסכות ואלכוג'ל",
              "nameEn": "כפפות מסכות ואלכוג'ל",
              "parentId": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
              "chainHints": {
                "ramiLevy": [
                  "40"
                ],
                "shufersal": [
                  "A340204"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון/מטליות-למשטח-ולרצפה",
              "nameHe": "מטליות למשטח ולרצפה",
              "nameEn": "מטליות למשטח ולרצפה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
              "chainHints": {
                "ramiLevy": [
                  "204"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון/ברזלית-כרית-יפנית-סקוטש",
              "nameHe": "ברזלית, כרית יפנית, סקוטש",
              "nameEn": "ברזלית, כרית יפנית, סקוטש",
              "parentId": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
              "chainHints": {
                "ramiLevy": [
                  "240"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון/כלי-ניקיון",
              "nameHe": "כלי ניקיון",
              "nameEn": "כלי ניקיון",
              "parentId": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
              "chainHints": {
                "ramiLevy": [
                  "535"
                ],
                "shufersal": [
                  "A341401",
                  "A340207",
                  "A341701",
                  "G200101",
                  "A910503"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון/ניקוי-נעליים",
              "nameHe": "ניקוי נעליים",
              "nameEn": "ניקוי נעליים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
              "chainHints": {
                "ramiLevy": [
                  "542"
                ],
                "shufersal": [
                  "A340216",
                  "A340219",
                  "A340207"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון/בלוק-לניקוי",
              "nameHe": "בלוק לניקוי",
              "nameEn": "בלוק לניקוי",
              "parentId": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
              "chainHints": {
                "ramiLevy": [
                  "819"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון/מוצרי-ניקיון-סיטונאות",
              "nameHe": "מוצרי ניקיון סיטונאות",
              "nameEn": "מוצרי ניקיון סיטונאות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
              "chainHints": {
                "ramiLevy": [
                  "1093"
                ],
                "shufersal": [
                  "A340219",
                  "A340207",
                  "A340204"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון/מטליות-לרכב",
              "nameHe": "אביזרי ניקיון לרכב",
              "nameEn": "אביזרי ניקיון לרכב",
              "parentId": "dept/אחזקת-הבית-ובע-ח/אביזרי-ניקיון",
              "chainHints": {
                "ramiLevy": [
                  "1169"
                ],
                "shufersal": [
                  "A340219",
                  "C300101",
                  "G200302"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר",
          "nameHe": "קוטל חרקים ומבשמי אויר",
          "nameEn": "קוטל חרקים ומבשמי אויר",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "249"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר/ניקוי-אסלה-ואמבטיה",
              "nameHe": "ניקוי אסלה ואמבטיה",
              "nameEn": "ניקוי אסלה ואמבטיה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר",
              "chainHints": {
                "ramiLevy": [
                  "62"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר/מטהרי-אויר",
              "nameHe": "מטהרי אויר",
              "nameEn": "מטהרי אויר",
              "parentId": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר",
              "chainHints": {
                "ramiLevy": [
                  "234"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר/קוטל-חרקים-ותכשירי-יתושים",
              "nameHe": "קוטל חרקים ותכשירי יתושים",
              "nameEn": "קוטל חרקים ותכשירי יתושים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר",
              "chainHints": {
                "ramiLevy": [
                  "401"
                ],
                "shufersal": [
                  "A341410"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר/מפיצי-ריח-ומטהרי-אוויר",
              "nameHe": "מפיצי ריח ומטהרי אוויר",
              "nameEn": "מפיצי ריח ומטהרי אוויר",
              "parentId": "dept/אחזקת-הבית-ובע-ח/קוטל-חרקים-ומבשמי-אויר",
              "chainHints": {
                "ramiLevy": [
                  "1122"
                ],
                "shufersal": [
                  "A340505"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/unknown-250",
          "nameHe": "(unknown:250)",
          "nameEn": "(unknown:250)",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "250"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/unknown-250/unknown-143",
              "nameHe": "(unknown:143)",
              "nameEn": "(unknown:143)",
              "parentId": "dept/אחזקת-הבית-ובע-ח/unknown-250",
              "chainHints": {
                "ramiLevy": [
                  "143"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/unknown-250/unknown-847",
              "nameHe": "(unknown:847)",
              "nameEn": "(unknown:847)",
              "parentId": "dept/אחזקת-הבית-ובע-ח/unknown-250",
              "chainHints": {
                "ramiLevy": [
                  "847"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
          "nameHe": "הכל לבית",
          "nameEn": "הכל לבית",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "283"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/מוצרי-כביסה-נלווים",
              "nameHe": "מוצרי כביסה נלווים",
              "nameEn": "מוצרי כביסה נלווים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "141"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/כלי-בית",
              "nameHe": "כלי בית",
              "nameEn": "כלי בית",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "499"
                ],
                "shufersal": [
                  "G200104",
                  "G200101",
                  "G200105",
                  "G200103"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/כלי-מטבח",
              "nameHe": "כלי מטבח",
              "nameEn": "כלי מטבח",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "534"
                ],
                "shufersal": [
                  "A390102",
                  "A390103"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/ציוד-משרדי",
              "nameHe": "ציוד משרדי",
              "nameEn": "ציוד משרדי",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "536"
                ],
                "shufersal": [
                  "G200102",
                  "G161002"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/משחקים-לילדים",
              "nameHe": "משחקים לילדים",
              "nameEn": "משחקים לילדים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "541"
                ],
                "shufersal": [
                  "C200101",
                  "G150304",
                  "G160907",
                  "G160906",
                  "G030110"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/מוצרי-חשמל-ואלקטרוניקה",
              "nameHe": "מוצרי חשמל ואלקטרוניקה",
              "nameEn": "מוצרי חשמל ואלקטרוניקה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "816"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/טקסטיל",
              "nameHe": "טקסטיל",
              "nameEn": "טקסטיל",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "820"
                ],
                "shufersal": [
                  "G130302",
                  "G130303",
                  "G130307",
                  "G130301"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/מטאטאים-מגבים-ויעה",
              "nameHe": "מטאטאים, מגבים ויעה",
              "nameEn": "מטאטאים, מגבים ויעה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "824"
                ],
                "shufersal": [
                  "A340213"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/אביזרי-נוי-ושטיחים",
              "nameHe": "אביזרי נוי  ושטיחים",
              "nameEn": "אביזרי נוי  ושטיחים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "825"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/סוכות",
              "nameHe": "סוכות",
              "nameEn": "סוכות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "833"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/עציצים",
              "nameHe": "עציצים",
              "nameEn": "עציצים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "834"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/מוצרי-חשמל",
              "nameHe": "מוצרי חשמל",
              "nameEn": "מוצרי חשמל",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "838"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/חנוכה",
              "nameHe": "חנוכה",
              "nameEn": "חנוכה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "839"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/קופסאות-לאחסון-מזון",
              "nameHe": "קופסאות לאחסון מזון",
              "nameEn": "קופסאות לאחסון מזון",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "1065"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/מזוודות",
              "nameHe": "מזוודות",
              "nameEn": "מזוודות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "1145"
                ],
                "shufersal": [
                  "G160803",
                  "G160805"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/אביזרי-שירותים-ואמבטיה",
              "nameHe": "אביזרי שירותים ואמבטיה",
              "nameEn": "אביזרי שירותים ואמבטיה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "1155"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/אביזרים-ליום-העצמאות",
              "nameHe": "אביזרים ליום העצמאות",
              "nameEn": "אביזרים ליום העצמאות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "1164"
                ],
                "shufersal": [
                  "G030702"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/אביזירי-כושר-ופנאי",
              "nameHe": "אביזירי כושר ופנאי",
              "nameEn": "אביזירי כושר ופנאי",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "1170"
                ],
                "shufersal": [
                  "C200101",
                  "G030201",
                  "G030202",
                  "G160301",
                  "G160401"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/סירים-ומחבתות-1",
              "nameHe": "סירים ומחבתות",
              "nameEn": "סירים ומחבתות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "1221"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/כלי-בית/כלי-אוכל-לילדים",
              "nameHe": "כלי אוכל לילדים",
              "nameEn": "כלי אוכל לילדים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/כלי-בית",
              "chainHints": {
                "ramiLevy": [
                  "1222"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים",
          "nameHe": "מוצרי ילדים",
          "nameEn": "מוצרי ילדים",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "294"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים/משחקים-לילדים",
              "nameHe": "משחקים לילדים",
              "nameEn": "משחקים לילדים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים",
              "chainHints": {
                "ramiLevy": [
                  "541"
                ],
                "shufersal": [
                  "C200101",
                  "G170203",
                  "G150708",
                  "G150706",
                  "G150710",
                  "G150301",
                  "G170307",
                  "G150305",
                  "G160905",
                  "G160901",
                  "G160904",
                  "G160201"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים/אביזרי-קיץ",
              "nameHe": "אביזרי קיץ",
              "nameEn": "אביזרי קיץ",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים",
              "chainHints": {
                "ramiLevy": [
                  "812"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים/unknown-823",
              "nameHe": "(unknown:823)",
              "nameEn": "(unknown:823)",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים",
              "chainHints": {
                "ramiLevy": [
                  "823"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים/unknown-832",
              "nameHe": "(unknown:832)",
              "nameEn": "(unknown:832)",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים",
              "chainHints": {
                "ramiLevy": [
                  "832"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים/בקבוקים-2",
              "nameHe": "בקבוקים",
              "nameEn": "בקבוקים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים",
              "chainHints": {
                "ramiLevy": [
                  "959"
                ],
                "shufersal": [
                  "G140603",
                  "A390104",
                  "G150702",
                  "G130112"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים/unknown-1175",
              "nameHe": "(unknown:1175)",
              "nameEn": "(unknown:1175)",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-ילדים",
              "chainHints": {
                "ramiLevy": [
                  "1175"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/ביגוד",
          "nameHe": "ביגוד ואקססוריס",
          "nameEn": "ביגוד ואקססוריס",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "471"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ביגוד/גופיות",
              "nameHe": "טי שרט וגופיות",
              "nameEn": "טי שרט וגופיות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ביגוד",
              "chainHints": {
                "ramiLevy": [
                  "835"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ביגוד/הלבשה-תחתונה",
              "nameHe": "הלבשה תחתונה",
              "nameEn": "הלבשה תחתונה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ביגוד",
              "chainHints": {
                "ramiLevy": [
                  "836"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ביגוד/גרביים",
              "nameHe": "גרביים",
              "nameEn": "גרביים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ביגוד",
              "chainHints": {
                "ramiLevy": [
                  "851"
                ],
                "shufersal": [
                  "G161201"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ביגוד/unknown-1185",
              "nameHe": "(unknown:1185)",
              "nameEn": "(unknown:1185)",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ביגוד",
              "chainHints": {
                "ramiLevy": [
                  "1185"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ביגוד/מטריות",
              "nameHe": "מטריות",
              "nameEn": "מטריות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ביגוד",
              "chainHints": {
                "ramiLevy": [
                  "1186"
                ],
                "shufersal": [
                  "G161203"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ביגוד/כפפות-וכובעי-גרב",
              "nameHe": "כפפות וכובעי גרב",
              "nameEn": "כפפות וכובעי גרב",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ביגוד",
              "chainHints": {
                "ramiLevy": [
                  "1217"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל-ואלקטרוניקה",
          "nameHe": "מוצרי חשמל ואלקטרוניקה",
          "nameEn": "מוצרי חשמל ואלקטרוניקה",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "494"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל-ואלקטרוניקה/מוצרי-חשמל-ואלקטרוניקה",
              "nameHe": "מוצרי חשמל ואלקטרוניקה",
              "nameEn": "מוצרי חשמל ואלקטרוניקה",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל-ואלקטרוניקה",
              "chainHints": {
                "ramiLevy": [
                  "816"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל",
          "nameHe": "מוצרי חשמל",
          "nameEn": "מוצרי חשמל",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "589"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל/סוללה",
              "nameHe": "סוללות",
              "nameEn": "סוללות",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל",
              "chainHints": {
                "ramiLevy": [
                  "1057"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל/קומקום",
              "nameHe": "קומקומים",
              "nameEn": "קומקומים",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל",
              "chainHints": {
                "ramiLevy": [
                  "1206"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל/חשמל-למטבח",
              "nameHe": "חשמל למטבח",
              "nameEn": "חשמל למטבח",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל",
              "chainHints": {
                "ramiLevy": [
                  "1207"
                ],
                "shufersal": [
                  "C200101",
                  "C050101",
                  "C300101",
                  "G020107",
                  "G020403",
                  "G020402",
                  "G020202",
                  "G020109",
                  "G020501",
                  "G020401",
                  "G020404",
                  "G020111",
                  "A130605",
                  "A390104",
                  "A500601",
                  "A390106",
                  "G020110",
                  "G020503",
                  "G020203",
                  "G020201",
                  "G020204",
                  "G020205"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל/חשמל-לבית",
              "nameHe": "חשמל לבית",
              "nameEn": "חשמל לבית",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל",
              "chainHints": {
                "ramiLevy": [
                  "1209"
                ],
                "shufersal": [
                  "C010105",
                  "C030106",
                  "C020101",
                  "C020102",
                  "C010104",
                  "C010103",
                  "C200101",
                  "C300101",
                  "A501101",
                  "C050101",
                  "G030201",
                  "G030203",
                  "G030204",
                  "G030104",
                  "G030205",
                  "G030208",
                  "G030702",
                  "G030705",
                  "G030703",
                  "G030701",
                  "G030102",
                  "G030101",
                  "G030106",
                  "G030108",
                  "G030111",
                  "G030403",
                  "G030401",
                  "G010301",
                  "G010201",
                  "G010103",
                  "G010309",
                  "G010310",
                  "G010602",
                  "G010203",
                  "G010403",
                  "G180407",
                  "G010605",
                  "G010601",
                  "G010401",
                  "G010405",
                  "G990102",
                  "G150707",
                  "G150701",
                  "A510101",
                  "A390106",
                  "A500601",
                  "G010606",
                  "G010202",
                  "G010311",
                  "G010102",
                  "G010101",
                  "G010106",
                  "G150705",
                  "G170101",
                  "G170203",
                  "G170201",
                  "G170202",
                  "G170204",
                  "G170504",
                  "G170505",
                  "G170506",
                  "G170501",
                  "G170502",
                  "G170301",
                  "G170306",
                  "G170304",
                  "G170303",
                  "G030407",
                  "G170401",
                  "G170402",
                  "G170403",
                  "G150601",
                  "G150602",
                  "G150502",
                  "G150504",
                  "G010404",
                  "G010204",
                  "G010205",
                  "G150708",
                  "G150704",
                  "G150709",
                  "G150703",
                  "G150710",
                  "G130504",
                  "G130505",
                  "G130503",
                  "G150712",
                  "G150711",
                  "G130402",
                  "D500101",
                  "G150101",
                  "G150104",
                  "G150103",
                  "G150402",
                  "G010604",
                  "G150302",
                  "G150301",
                  "G130506",
                  "G130303",
                  "G180403",
                  "G180408",
                  "G180601",
                  "G180602",
                  "G180603",
                  "G180201",
                  "G180202",
                  "G180203",
                  "G180204",
                  "G180301",
                  "G180302",
                  "G180303",
                  "G180306",
                  "G180101",
                  "G180103",
                  "G180102",
                  "G250101"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל/מוצרי-טיפוח",
              "nameHe": "מוצרי טיפוח",
              "nameEn": "מוצרי טיפוח",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל",
              "chainHints": {
                "ramiLevy": [
                  "1210"
                ]
              },
              "children": []
            },
            {
              "id": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל/אביזרים-לסלולר",
              "nameHe": "אביזרים לסלולר",
              "nameEn": "אביזרים לסלולר",
              "parentId": "dept/אחזקת-הבית-ובע-ח/מוצרי-חשמל",
              "chainHints": {
                "ramiLevy": [
                  "1211"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/אחזקת-הבית-ובע-ח/ספרים",
          "nameHe": "ספרים",
          "nameEn": "ספרים",
          "parentId": "dept/אחזקת-הבית-ובע-ח",
          "chainHints": {
            "ramiLevy": [
              "596"
            ]
          },
          "children": [
            {
              "id": "dept/אחזקת-הבית-ובע-ח/ספרים/ספרי-קודש",
              "nameHe": "ספרי קודש",
              "nameEn": "ספרי קודש",
              "parentId": "dept/אחזקת-הבית-ובע-ח/ספרים",
              "chainHints": {
                "ramiLevy": [
                  "1220"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/פארם-ותינוקות",
      "nameHe": "פארם ותינוקות",
      "nameEn": "פארם ותינוקות",
      "icon": "Pill",
      "chainHints": {
        "ramiLevy": [
          "60"
        ]
      },
      "children": [
        {
          "id": "dept/פארם-ותינוקות/מוצרי-הגיינה",
          "nameHe": "מוצרי הגיינה",
          "nameEn": "מוצרי הגיינה",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "251"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/מוצרי-הגיינה/טמפונים",
              "nameHe": "טמפונים",
              "nameEn": "טמפונים",
              "parentId": "dept/פארם-ותינוקות/מוצרי-הגיינה",
              "chainHints": {
                "ramiLevy": [
                  "456"
                ],
                "shufersal": [
                  "A440704",
                  "A310501",
                  "A380206",
                  "A380102",
                  "A380101",
                  "A380117",
                  "A380116",
                  "A312703",
                  "B070904",
                  "B050701",
                  "B070606",
                  "B071001",
                  "B070702",
                  "B070701",
                  "B070703",
                  "B070704",
                  "B050601",
                  "B020202",
                  "B110101",
                  "G180409"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-הגיינה/מגני-תחתון",
              "nameHe": "מגני תחתון",
              "nameEn": "מגני תחתון",
              "parentId": "dept/פארם-ותינוקות/מוצרי-הגיינה",
              "chainHints": {
                "ramiLevy": [
                  "457"
                ],
                "shufersal": [
                  "A310504"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-הגיינה/תחבושות-היגייניות",
              "nameHe": "תחבושות היגייניות",
              "nameEn": "תחבושות היגייניות",
              "parentId": "dept/פארם-ותינוקות/מוצרי-הגיינה",
              "chainHints": {
                "ramiLevy": [
                  "555"
                ],
                "shufersal": [
                  "A310510",
                  "A310513",
                  "A310504",
                  "A310507",
                  "A310501",
                  "B040302"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-הגיינה/היגיינה-אינטימית-לאישה",
              "nameHe": "היגיינה אינטימית לאישה",
              "nameEn": "היגיינה אינטימית לאישה",
              "parentId": "dept/פארם-ותינוקות/מוצרי-הגיינה",
              "chainHints": {
                "ramiLevy": [
                  "558"
                ],
                "shufersal": [
                  "A311402",
                  "A310507",
                  "A311406"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/מוצרי-פארם",
          "nameHe": "מוצרי פארם",
          "nameEn": "מוצרי פארם",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "252"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/מוצרי-פארם/מוצרי-טיפוח-פנים",
              "nameHe": "מוצרי טיפוח פנים",
              "nameEn": "מוצרי טיפוח פנים",
              "parentId": "dept/פארם-ותינוקות/מוצרי-פארם",
              "chainHints": {
                "ramiLevy": [
                  "348"
                ],
                "shufersal": [
                  "A310207",
                  "A310216",
                  "A310210",
                  "A312603",
                  "A312604",
                  "A310213",
                  "A290101",
                  "A312606",
                  "A312803",
                  "A312801",
                  "A312802",
                  "A312702",
                  "A400105",
                  "B090505",
                  "B010602",
                  "B010605",
                  "B020208",
                  "A500501",
                  "B030605",
                  "B030603",
                  "B030604",
                  "B030601",
                  "B030805",
                  "B030804",
                  "B030803",
                  "B010603",
                  "B010604",
                  "B010204",
                  "B010601",
                  "B031001",
                  "B031201",
                  "B020402",
                  "B010102",
                  "B030509",
                  "B030503",
                  "B030504",
                  "B030506",
                  "B120104",
                  "B030606",
                  "B030602",
                  "B020202",
                  "B030801",
                  "B020205",
                  "B020203",
                  "B020602",
                  "B020603",
                  "B020604",
                  "B020403",
                  "B140502",
                  "B020404",
                  "B050402",
                  "B050401",
                  "B050404",
                  "G130308",
                  "B030508"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-פארם/צמר-גפן-וקיסמי-אוזניים",
              "nameHe": "צמר גפן וקיסמי אוזניים",
              "nameEn": "צמר גפן וקיסמי אוזניים",
              "parentId": "dept/פארם-ותינוקות/מוצרי-פארם",
              "chainHints": {
                "ramiLevy": [
                  "446"
                ],
                "shufersal": [
                  "A312608",
                  "B090307"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-פארם/אביזרי-חבישה",
              "nameHe": "אביזרי חבישה",
              "nameEn": "אביזרי חבישה",
              "parentId": "dept/פארם-ותינוקות/מוצרי-פארם",
              "chainHints": {
                "ramiLevy": [
                  "458"
                ],
                "shufersal": [
                  "B070507",
                  "B070209",
                  "B060503",
                  "G030506",
                  "G030502",
                  "G030103",
                  "G030505",
                  "G030503",
                  "G130103",
                  "G160804",
                  "B110101",
                  "G150708",
                  "G170506",
                  "G130402",
                  "G150707",
                  "G180405"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-פארם/צבעי-שיער",
              "nameHe": "צבעי שיער",
              "nameEn": "צבעי שיער",
              "parentId": "dept/פארם-ותינוקות/מוצרי-פארם",
              "chainHints": {
                "ramiLevy": [
                  "472"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-פארם/מוצרי-הגנה-מהשמש",
              "nameHe": "מוצרי הגנה מהשמש",
              "nameEn": "מוצרי הגנה מהשמש",
              "parentId": "dept/פארם-ותינוקות/מוצרי-פארם",
              "chainHints": {
                "ramiLevy": [
                  "510"
                ],
                "shufersal": [
                  "A312406",
                  "A312805",
                  "A312802",
                  "D500101"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-פארם/אביזירי-שיער",
              "nameHe": "אביזרי שיער",
              "nameEn": "אביזרי שיער",
              "parentId": "dept/פארם-ותינוקות/מוצרי-פארם",
              "chainHints": {
                "ramiLevy": [
                  "1017"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-פארם/עיצוב-שיער",
              "nameHe": "עיצוב שיער",
              "nameEn": "עיצוב שיער",
              "parentId": "dept/פארם-ותינוקות/מוצרי-פארם",
              "chainHints": {
                "ramiLevy": [
                  "1018"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מוצרי-פארם/טיפוח-ציפורניים",
              "nameHe": "טיפוח ידיים וציפורניים",
              "nameEn": "טיפוח ידיים וציפורניים",
              "parentId": "dept/פארם-ותינוקות/מוצרי-פארם",
              "chainHints": {
                "ramiLevy": [
                  "1042"
                ],
                "shufersal": [
                  "A312602",
                  "A312604",
                  "B070507",
                  "B090202",
                  "B090203",
                  "B090201",
                  "B090205",
                  "B090204"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/חיתולים-ומגבונים",
          "nameHe": "חיתולים ומגבונים",
          "nameEn": "חיתולים ומגבונים",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "254"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/חיתולים-ומגבונים/מגבונים",
              "nameHe": "מגבונים",
              "nameEn": "מגבונים",
              "parentId": "dept/פארם-ותינוקות/חיתולים-ומגבונים",
              "chainHints": {
                "ramiLevy": [
                  "132"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/חיתולים-ומגבונים/חיתולים",
              "nameHe": "חיתולים",
              "nameEn": "חיתולים",
              "parentId": "dept/פארם-ותינוקות/חיתולים-ומגבונים",
              "chainHints": {
                "ramiLevy": [
                  "134"
                ],
                "shufersal": [
                  "A380203",
                  "A380206",
                  "A380201",
                  "A380202",
                  "A380204",
                  "A400105",
                  "B070504",
                  "B070502",
                  "B070503",
                  "B070505",
                  "B070606",
                  "B070605",
                  "B070604",
                  "B070203",
                  "B070208",
                  "B070206",
                  "B070205",
                  "B071001",
                  "B071004",
                  "B060216",
                  "B020202",
                  "B020204",
                  "B020402",
                  "A500501",
                  "B060201",
                  "B060211",
                  "G170206",
                  "G130301",
                  "G161004",
                  "G161003",
                  "G160803",
                  "G230108",
                  "G230705"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/מזון-לתינוקות",
          "nameHe": "מזון לתינוקות",
          "nameEn": "מזון לתינוקות",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "255"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/מזון-לתינוקות/תחליפי-חלב-לתינוק",
              "nameHe": "תחליפי חלב לתינוק",
              "nameEn": "תחליפי חלב לתינוק",
              "parentId": "dept/פארם-ותינוקות/מזון-לתינוקות",
              "chainHints": {
                "ramiLevy": [
                  "61"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מזון-לתינוקות/ביסקוויטים-וחטיפים-לתינוק",
              "nameHe": "ביסקוויטים וחטיפים לתינוק",
              "nameEn": "ביסקוויטים וחטיפים לתינוק",
              "parentId": "dept/פארם-ותינוקות/מזון-לתינוקות",
              "chainHints": {
                "ramiLevy": [
                  "292"
                ],
                "shufersal": [
                  "A312310"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מזון-לתינוקות/מחית-לתינוק",
              "nameHe": "מחית לתינוק",
              "nameEn": "מחית לתינוק",
              "parentId": "dept/פארם-ותינוקות/מזון-לתינוקות",
              "chainHints": {
                "ramiLevy": [
                  "373"
                ],
                "shufersal": [
                  "A312310",
                  "A312319",
                  "A380102",
                  "A380101",
                  "A380108",
                  "A380103",
                  "A380117",
                  "A380112",
                  "A380106",
                  "A380113",
                  "A380105",
                  "A380104",
                  "A380116",
                  "A380109",
                  "A380115",
                  "A380114"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/מזון-לתינוקות/דייסה-לתינוק",
              "nameHe": "דייסה לתינוק",
              "nameEn": "דייסה לתינוק",
              "parentId": "dept/פארם-ותינוקות/מזון-לתינוקות",
              "chainHints": {
                "ramiLevy": [
                  "524"
                ],
                "shufersal": [
                  "A312301"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים",
          "nameHe": "טיפוח ואביזרי תינוקות וילדים",
          "nameEn": "טיפוח ואביזרי תינוקות וילדים",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "256"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים/מוצצים",
              "nameHe": "מוצצים",
              "nameEn": "מוצצים",
              "parentId": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים",
              "chainHints": {
                "ramiLevy": [
                  "443"
                ],
                "shufersal": [
                  "A320307",
                  "A312403",
                  "A312328"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים/מוצרי-היגיינה-לתינוק",
              "nameHe": "מוצרי היגיינה לתינוק",
              "nameEn": "מוצרי היגיינה לתינוק",
              "parentId": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים",
              "chainHints": {
                "ramiLevy": [
                  "444"
                ],
                "shufersal": [
                  "A312401",
                  "A312307",
                  "A311402",
                  "A311405",
                  "A312304",
                  "A312009",
                  "A320201",
                  "A312804",
                  "A320202",
                  "A320307"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים/סבון-נוזלי-לילדים-ותינוקות",
              "nameHe": "סבון נוזלי לילדים ותינוקות",
              "nameEn": "סבון נוזלי לילדים ותינוקות",
              "parentId": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים",
              "chainHints": {
                "ramiLevy": [
                  "445"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים/שמפו-ומרכך-לילדים-ותינוקות",
              "nameHe": "שמפו ומרכך לילדים ותינוקות",
              "nameEn": "שמפו ומרכך לילדים ותינוקות",
              "parentId": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים",
              "chainHints": {
                "ramiLevy": [
                  "447"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים/הריון-והנקה",
              "nameHe": "הריון והנקה",
              "nameEn": "הריון והנקה",
              "parentId": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים",
              "chainHints": {
                "ramiLevy": [
                  "554"
                ],
                "shufersal": [
                  "A312403",
                  "A320306"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים/אביזרים-לתינוק",
              "nameHe": "אביזרים לתינוק",
              "nameEn": "אביזרים לתינוק",
              "parentId": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים",
              "chainHints": {
                "ramiLevy": [
                  "556"
                ],
                "shufersal": [
                  "A310804",
                  "A312403",
                  "A312328",
                  "A320304",
                  "B090502",
                  "B090501",
                  "B090503",
                  "G030406",
                  "A312404"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים/בקבוקים",
              "nameHe": "בקבוקים",
              "nameEn": "בקבוקים",
              "parentId": "dept/פארם-ותינוקות/טיפוח-ואביזרי-תינוקות-וילדים",
              "chainHints": {
                "ramiLevy": [
                  "557"
                ],
                "shufersal": [
                  "A312403",
                  "A312328"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/סבונים",
          "nameHe": "סבונים",
          "nameEn": "סבונים",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "257"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/סבונים/סבון-מוצק",
              "nameHe": "סבון מוצק",
              "nameEn": "סבון מוצק",
              "parentId": "dept/פארם-ותינוקות/סבונים",
              "chainHints": {
                "ramiLevy": [
                  "214"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/סבונים/סבון-נוזלי-לידיים",
              "nameHe": "סבון נוזלי לידיים",
              "nameEn": "סבון נוזלי לידיים",
              "parentId": "dept/פארם-ותינוקות/סבונים",
              "chainHints": {
                "ramiLevy": [
                  "452"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/סבונים/סבון-נוזלי-לרחצה",
              "nameHe": "סבון נוזלי לרחצה",
              "nameEn": "סבון נוזלי לרחצה",
              "parentId": "dept/פארם-ותינוקות/סבונים",
              "chainHints": {
                "ramiLevy": [
                  "453"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/סבונים/ג-ל-רחצה-לגבר",
              "nameHe": "ג'ל רחצה לגבר",
              "nameEn": "ג'ל רחצה לגבר",
              "parentId": "dept/פארם-ותינוקות/סבונים",
              "chainHints": {
                "ramiLevy": [
                  "454"
                ],
                "shufersal": [
                  "B050601",
                  "G130308",
                  "G190304",
                  "G190301"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/שמפו-ומרכך",
          "nameHe": "שמפו, מרכך וטיפוח הגוף",
          "nameEn": "שמפו, מרכך וטיפוח הגוף",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "258"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/אביזרי-רחצה",
              "nameHe": "אביזרי רחצה",
              "nameEn": "אביזרי רחצה",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "222"
                ],
                "shufersal": [
                  "A311404",
                  "A311402",
                  "A311407",
                  "A310210",
                  "A290101",
                  "B040207",
                  "B040206"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/מוצרי-טיפוח-שיער",
              "nameHe": "מסכות וקרם לשיער",
              "nameEn": "מסכות וקרם לשיער",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "366"
                ],
                "shufersal": [
                  "A311402",
                  "A311404",
                  "A311103",
                  "A312606",
                  "A311104",
                  "A311106",
                  "A311706",
                  "A311101",
                  "A311102",
                  "B090306",
                  "B090305",
                  "B010301",
                  "B090505",
                  "B050303",
                  "B050302",
                  "B050301",
                  "B300105",
                  "B300101",
                  "B300112",
                  "B040204"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/מוצצים",
              "nameHe": "מוצצים",
              "nameEn": "מוצצים",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "443"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/שמפו-ומרכך-פרימיום",
              "nameHe": "שמפו ומרכך פרימיום",
              "nameEn": "שמפו ומרכך פרימיום",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "450"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/שמפו-ומרכך-רגיל",
              "nameHe": "שמפו ומרכך",
              "nameEn": "שמפו ומרכך",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "451"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/צבעי-שיער",
              "nameHe": "צבעי שיער",
              "nameEn": "צבעי שיער",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "472"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/מוצרי-טיפוח-לגוף",
              "nameHe": "מוצרי טיפוח לגוף",
              "nameEn": "מוצרי טיפוח לגוף",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "509"
                ],
                "shufersal": [
                  "A311402",
                  "A311406",
                  "A310224",
                  "B090302"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/הריון-והנקה",
              "nameHe": "הריון והנקה",
              "nameEn": "הריון והנקה",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "554"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/אביזירי-שיער",
              "nameHe": "אביזרי שיער",
              "nameEn": "אביזרי שיער",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "1017"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/שמפו-ומרכך/טיפוח-שיער-מיקי-בוגנים",
              "nameHe": "טיפוח שיער מיקי בוגנים",
              "nameEn": "טיפוח שיער מיקי בוגנים",
              "parentId": "dept/פארם-ותינוקות/שמפו-ומרכך",
              "chainHints": {
                "ramiLevy": [
                  "1113"
                ],
                "shufersal": [
                  "B300114",
                  "B300102",
                  "B300111",
                  "B300106",
                  "B300109",
                  "B300103",
                  "B300104",
                  "B300115"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/דאודורנט",
          "nameHe": "דאודורנט",
          "nameEn": "דאודורנט",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "261"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/דאודורנט/דאודורנט-סטיק-לאישה",
              "nameHe": "דאודורנט סטיק לאישה",
              "nameEn": "דאודורנט סטיק לאישה",
              "parentId": "dept/פארם-ותינוקות/דאודורנט",
              "chainHints": {
                "ramiLevy": [
                  "548"
                ],
                "shufersal": [
                  "A310216",
                  "A290101",
                  "B120102",
                  "B120104"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/דאודורנט/דאודורנט-סטיק-לגבר",
              "nameHe": "דאודורנט סטיק לגבר",
              "nameEn": "דאודורנט סטיק לגבר",
              "parentId": "dept/פארם-ותינוקות/דאודורנט",
              "chainHints": {
                "ramiLevy": [
                  "549"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/דאודורנט/דאודורנט-ספריי-לאישה",
              "nameHe": "דאודורנט ספריי לאישה",
              "nameEn": "דאודורנט ספריי לאישה",
              "parentId": "dept/פארם-ותינוקות/דאודורנט",
              "chainHints": {
                "ramiLevy": [
                  "550"
                ],
                "shufersal": [
                  "A310210",
                  "A290101"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/דאודורנט/דאודורנט-ספריי-לגבר",
              "nameHe": "דאודורנט ספריי לגבר",
              "nameEn": "דאודורנט ספריי לגבר",
              "parentId": "dept/פארם-ותינוקות/דאודורנט",
              "chainHints": {
                "ramiLevy": [
                  "551"
                ],
                "shufersal": [
                  "A310207"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/דאודורנט/דאודורנט-רול-און-לאישה",
              "nameHe": "דאודורנט רול און לאישה",
              "nameEn": "דאודורנט רול און לאישה",
              "parentId": "dept/פארם-ותינוקות/דאודורנט",
              "chainHints": {
                "ramiLevy": [
                  "552"
                ],
                "shufersal": [
                  "A310222",
                  "A310219"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/דאודורנט/דאודורנט-רול-און-לגבר",
              "nameHe": "דאודורנט רול און לגבר",
              "nameEn": "דאודורנט רול און לגבר",
              "parentId": "dept/פארם-ותינוקות/דאודורנט",
              "chainHints": {
                "ramiLevy": [
                  "553"
                ],
                "shufersal": [
                  "A310219"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/גילוח-והסרת-שיער",
          "nameHe": "גילוח והסרת שיער",
          "nameEn": "גילוח והסרת שיער",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "292"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/גילוח-והסרת-שיער/תכשירי-גילוח-לגבר",
              "nameHe": "תכשירי גילוח לגבר",
              "nameEn": "תכשירי גילוח לגבר",
              "parentId": "dept/פארם-ותינוקות/גילוח-והסרת-שיער",
              "chainHints": {
                "ramiLevy": [
                  "399"
                ],
                "shufersal": [
                  "A311701",
                  "A311704",
                  "A311703",
                  "B050201"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/גילוח-והסרת-שיער/מוצרי-הסרת-שיער",
              "nameHe": "מוצרי הסרת שיער לנשים",
              "nameEn": "מוצרי הסרת שיער לנשים",
              "parentId": "dept/פארם-ותינוקות/גילוח-והסרת-שיער",
              "chainHints": {
                "ramiLevy": [
                  "471"
                ],
                "shufersal": [
                  "A311705",
                  "A500501",
                  "A311706",
                  "A312405"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/גילוח-והסרת-שיער/גילוח-והסרת-שיער-לגברים",
              "nameHe": "גילוח והסרת שיער לגברים",
              "nameEn": "גילוח והסרת שיער לגברים",
              "parentId": "dept/פארם-ותינוקות/גילוח-והסרת-שיער",
              "chainHints": {
                "ramiLevy": [
                  "984"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/גילוח-והסרת-שיער/סכיני-גילוח",
              "nameHe": "סכיני גילוח",
              "nameEn": "סכיני גילוח",
              "parentId": "dept/פארם-ותינוקות/גילוח-והסרת-שיער",
              "chainHints": {
                "ramiLevy": [
                  "1105"
                ],
                "shufersal": [
                  "A311702"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/פארם-ותינוקות/היגיינת-הפה",
          "nameHe": "היגיינת הפה",
          "nameEn": "היגיינת הפה",
          "parentId": "dept/פארם-ותינוקות",
          "chainHints": {
            "ramiLevy": [
              "293"
            ]
          },
          "children": [
            {
              "id": "dept/פארם-ותינוקות/היגיינת-הפה/משחות-שיניים-לילדים",
              "nameHe": "משחות שיניים לילדים",
              "nameEn": "משחות שיניים לילדים",
              "parentId": "dept/פארם-ותינוקות/היגיינת-הפה",
              "chainHints": {
                "ramiLevy": [
                  "103"
                ],
                "shufersal": [
                  "A310804",
                  "A310805"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/היגיינת-הפה/משחות-מיוחדות",
              "nameHe": "משחות מיוחדות",
              "nameEn": "משחות מיוחדות",
              "parentId": "dept/פארם-ותינוקות/היגיינת-הפה",
              "chainHints": {
                "ramiLevy": [
                  "140"
                ],
                "shufersal": [
                  "A310808",
                  "B040609",
                  "B040608"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/היגיינת-הפה/קיסמי-שיניים-וחוט-דנטלי",
              "nameHe": "קיסמי שיניים וחוט דנטלי",
              "nameEn": "קיסמי שיניים וחוט דנטלי",
              "parentId": "dept/פארם-ותינוקות/היגיינת-הפה",
              "chainHints": {
                "ramiLevy": [
                  "269"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/היגיינת-הפה/מברשות-שיניים",
              "nameHe": "מברשות שיניים",
              "nameEn": "מברשות שיניים",
              "parentId": "dept/פארם-ותינוקות/היגיינת-הפה",
              "chainHints": {
                "ramiLevy": [
                  "285"
                ],
                "shufersal": [
                  "A310801",
                  "A310803",
                  "A310802",
                  "B040610"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/היגיינת-הפה/משחות-שיניים-מבוגרים",
              "nameHe": "משחות שיניים מבוגרים",
              "nameEn": "משחות שיניים מבוגרים",
              "parentId": "dept/פארם-ותינוקות/היגיינת-הפה",
              "chainHints": {
                "ramiLevy": [
                  "455"
                ]
              },
              "children": []
            },
            {
              "id": "dept/פארם-ותינוקות/היגיינת-הפה/מי-פה-ושטיפה-דנטלית",
              "nameHe": "מי פה ושטיפה דנטלית",
              "nameEn": "מי פה ושטיפה דנטלית",
              "parentId": "dept/פארם-ותינוקות/היגיינת-הפה",
              "chainHints": {
                "ramiLevy": [
                  "741"
                ],
                "shufersal": [
                  "A310807"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/מחלקה-85",
      "nameHe": "מחלקה 85",
      "nameEn": "מחלקה 85",
      "icon": "Package",
      "chainHints": {
        "ramiLevy": [
          "85"
        ]
      },
      "children": [
        {
          "id": "dept/מחלקה-85/גבינות",
          "nameHe": "גבינות",
          "nameEn": "גבינות",
          "parentId": "dept/מחלקה-85",
          "chainHints": {
            "ramiLevy": [
              "202"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-85/גבינות/unknown-189",
              "nameHe": "(unknown:189)",
              "nameEn": "(unknown:189)",
              "parentId": "dept/מחלקה-85/גבינות",
              "chainHints": {
                "ramiLevy": [
                  "189"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-85/יוגורט-ומעדני-חלב",
          "nameHe": "יוגורט ומעדני חלב",
          "nameEn": "יוגורט ומעדני חלב",
          "parentId": "dept/מחלקה-85",
          "chainHints": {
            "ramiLevy": [
              "203"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-85/יוגורט-ומעדני-חלב/unknown-466",
              "nameHe": "(unknown:466)",
              "nameEn": "(unknown:466)",
              "parentId": "dept/מחלקה-85/יוגורט-ומעדני-חלב",
              "chainHints": {
                "ramiLevy": [
                  "466"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-85/unknown-308",
          "nameHe": "(unknown:308)",
          "nameEn": "(unknown:308)",
          "parentId": "dept/מחלקה-85",
          "chainHints": {
            "ramiLevy": [
              "308"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-85/unknown-308/unknown-635",
              "nameHe": "(unknown:635)",
              "nameEn": "(unknown:635)",
              "parentId": "dept/מחלקה-85/unknown-308",
              "chainHints": {
                "ramiLevy": [
                  "635"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/מוצרי-חשמל-ואלקטרוניקה",
      "nameHe": "מוצרי חשמל ואלקטרוניקה",
      "nameEn": "מוצרי חשמל ואלקטרוניקה",
      "icon": "Package",
      "chainHints": {
        "ramiLevy": [
          "1234"
        ]
      },
      "children": [
        {
          "id": "dept/מוצרי-חשמל-ואלקטרוניקה/מוצרי-אפיה",
          "nameHe": "מוצרי אפיה",
          "nameEn": "מוצרי אפיה",
          "parentId": "dept/מוצרי-חשמל-ואלקטרוניקה",
          "chainHints": {
            "ramiLevy": [
              "275"
            ]
          },
          "children": [
            {
              "id": "dept/מוצרי-חשמל-ואלקטרוניקה/מוצרי-אפיה/ג-לי-סירופ-פודינג",
              "nameHe": "ג'לי, סירופ, פודינג",
              "nameEn": "ג'לי, סירופ, פודינג",
              "parentId": "dept/מוצרי-חשמל-ואלקטרוניקה/מוצרי-אפיה",
              "chainHints": {
                "ramiLevy": [
                  "332"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/מחלקה-1237",
      "nameHe": "מחלקה 1237",
      "nameEn": "מחלקה 1237",
      "icon": "Package",
      "chainHints": {
        "ramiLevy": [
          "1237"
        ]
      },
      "children": [
        {
          "id": "dept/מחלקה-1237/משקאות-חריפים",
          "nameHe": "משקאות חריפים",
          "nameEn": "משקאות חריפים",
          "parentId": "dept/מחלקה-1237",
          "chainHints": {
            "ramiLevy": [
              "511"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1237/משקאות-חריפים/ג-ין-רום-וקוניאק",
              "nameHe": "ג'ין ורום",
              "nameEn": "ג'ין ורום",
              "parentId": "dept/מחלקה-1237/משקאות-חריפים",
              "chainHints": {
                "ramiLevy": [
                  "881"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1237/משקאות-חריפים/וודקה",
              "nameHe": "וודקה",
              "nameEn": "וודקה",
              "parentId": "dept/מחלקה-1237/משקאות-חריפים",
              "chainHints": {
                "ramiLevy": [
                  "882"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1237/משקאות-חריפים/ליקרים",
              "nameHe": "ליקרים",
              "nameEn": "ליקרים",
              "parentId": "dept/מחלקה-1237/משקאות-חריפים",
              "chainHints": {
                "ramiLevy": [
                  "891"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1237/יינות-1",
          "nameHe": "יינות שופינג",
          "nameEn": "יינות שופינג",
          "parentId": "dept/מחלקה-1237",
          "chainHints": {
            "ramiLevy": [
              "523"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1237/יינות-1/יינות",
              "nameHe": "יינות אדומים",
              "nameEn": "יינות אדומים",
              "parentId": "dept/מחלקה-1237/יינות-1",
              "chainHints": {
                "ramiLevy": [
                  "890"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1237/יינות-1/יינות-לבנים-1",
              "nameHe": "יינות לבנים-שופינג",
              "nameEn": "יינות לבנים-שופינג",
              "parentId": "dept/מחלקה-1237/יינות-1",
              "chainHints": {
                "ramiLevy": [
                  "939"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1237/יינות-1/יינות-רוזה",
              "nameHe": "יינות רוזה",
              "nameEn": "יינות רוזה",
              "parentId": "dept/מחלקה-1237/יינות-1",
              "chainHints": {
                "ramiLevy": [
                  "940"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1237/וויסקי-וברנדי",
          "nameHe": "וויסקי וברנדי",
          "nameEn": "וויסקי וברנדי",
          "parentId": "dept/מחלקה-1237",
          "chainHints": {
            "ramiLevy": [
              "524"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1237/וויסקי-וברנדי/וויסקי-וברנדי",
              "nameHe": "וויסקי סקוטי",
              "nameEn": "וויסקי סקוטי",
              "parentId": "dept/מחלקה-1237/וויסקי-וברנדי",
              "chainHints": {
                "ramiLevy": [
                  "883"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1237/וויסקי-וברנדי/וויסקי-בורבון",
              "nameHe": "וויסקי בורבון",
              "nameEn": "וויסקי בורבון",
              "parentId": "dept/מחלקה-1237/וויסקי-וברנדי",
              "chainHints": {
                "ramiLevy": [
                  "943"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1237/וויסקי-וברנדי/וויסקי-אירי",
              "nameHe": "וויסקי אירי",
              "nameEn": "וויסקי אירי",
              "parentId": "dept/מחלקה-1237/וויסקי-וברנדי",
              "chainHints": {
                "ramiLevy": [
                  "944"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/מחלקה-1238",
      "nameHe": "מחלקה 1238",
      "nameEn": "מחלקה 1238",
      "icon": "Package",
      "chainHints": {
        "ramiLevy": [
          "1238"
        ]
      },
      "children": [
        {
          "id": "dept/מחלקה-1238/ניקוי-פנים",
          "nameHe": "ניקוי פנים",
          "nameEn": "ניקוי פנים",
          "parentId": "dept/מחלקה-1238",
          "chainHints": {
            "ramiLevy": [
              "504"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1238/ניקוי-פנים/סבון-נוזלי-לפנים",
              "nameHe": "סבון נוזלי לפנים",
              "nameEn": "סבון נוזלי לפנים",
              "parentId": "dept/מחלקה-1238/ניקוי-פנים",
              "chainHints": {
                "ramiLevy": [
                  "900"
                ],
                "shufersal": [
                  "B030606"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1238/ניקוי-פנים/היגיינת-העין",
              "nameHe": "היגיינת העין",
              "nameEn": "היגיינת העין",
              "parentId": "dept/מחלקה-1238/ניקוי-פנים",
              "chainHints": {
                "ramiLevy": [
                  "992"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1238/טיפוח-שיער",
          "nameHe": "טיפוח שיער",
          "nameEn": "טיפוח שיער",
          "parentId": "dept/מחלקה-1238",
          "chainHints": {
            "ramiLevy": [
              "505"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1238/טיפוח-שיער/צבי-שיער",
              "nameHe": "צבע שיער",
              "nameEn": "צבע שיער",
              "parentId": "dept/מחלקה-1238/טיפוח-שיער",
              "chainHints": {
                "ramiLevy": [
                  "902"
                ],
                "shufersal": [
                  "B300116"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1238/טיפוח-פנים",
          "nameHe": "טיפוח פנים",
          "nameEn": "טיפוח פנים",
          "parentId": "dept/מחלקה-1238",
          "chainHints": {
            "ramiLevy": [
              "507"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1238/טיפוח-פנים/קרם-ותחליב-לחות",
              "nameHe": "קרם לחות",
              "nameEn": "קרם לחות",
              "parentId": "dept/מחלקה-1238/טיפוח-פנים",
              "chainHints": {
                "ramiLevy": [
                  "904"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1238/היגיינת-הפה-1",
          "nameHe": "היגיינת הפה-שופינג",
          "nameEn": "היגיינת הפה-שופינג",
          "parentId": "dept/מחלקה-1238",
          "chainHints": {
            "ramiLevy": [
              "514"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1238/היגיינת-הפה-1/מברשות-שיניים-1",
              "nameHe": "מברשות שיניים- שופינג",
              "nameEn": "מברשות שיניים- שופינג",
              "parentId": "dept/מחלקה-1238/היגיינת-הפה-1",
              "chainHints": {
                "ramiLevy": [
                  "916"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1238/טיפוח-גוף",
          "nameHe": "טיפוח גוף",
          "nameEn": "טיפוח גוף",
          "parentId": "dept/מחלקה-1238",
          "chainHints": {
            "ramiLevy": [
              "516"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1238/טיפוח-גוף/קרם-שמן-וחמאת-גוף",
              "nameHe": "קרם ,תחליב ושמן גוף",
              "nameEn": "קרם ,תחליב ושמן גוף",
              "parentId": "dept/מחלקה-1238/טיפוח-גוף",
              "chainHints": {
                "ramiLevy": [
                  "908"
                ],
                "shufersal": [
                  "A312603",
                  "A312602",
                  "B090301"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1238/טיפוח-גוף/קרמים-טיפוליים",
              "nameHe": "קרם טיפוח טיפולי",
              "nameEn": "קרם טיפוח טיפולי",
              "parentId": "dept/מחלקה-1238/טיפוח-גוף",
              "chainHints": {
                "ramiLevy": [
                  "957"
                ],
                "shufersal": [
                  "A312606",
                  "B070304",
                  "B070302",
                  "B070305"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1238/טיפוח-גוף/alin",
              "nameHe": "ALIN",
              "nameEn": "ALIN",
              "parentId": "dept/מחלקה-1238/טיפוח-גוף",
              "chainHints": {
                "ramiLevy": [
                  "1133"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1238/דאודורנט-1",
          "nameHe": "דאודורנט שופינג",
          "nameEn": "דאודורנט שופינג",
          "parentId": "dept/מחלקה-1238",
          "chainHints": {
            "ramiLevy": [
              "517"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1238/דאודורנט-1/דאודורנט-גברים",
              "nameHe": "דאודורנט גברים",
              "nameEn": "דאודורנט גברים",
              "parentId": "dept/מחלקה-1238/דאודורנט-1",
              "chainHints": {
                "ramiLevy": [
                  "912"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1238/מכשירי-מדידה-ובדיקה",
          "nameHe": "מכשירי מדידה ובדיקה",
          "nameEn": "מכשירי מדידה ובדיקה",
          "parentId": "dept/מחלקה-1238",
          "chainHints": {
            "ramiLevy": [
              "521"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1238/מכשירי-מדידה-ובדיקה/מכשירי-מדידה-ובדיקה",
              "nameHe": "מדי חום",
              "nameEn": "מדי חום",
              "parentId": "dept/מחלקה-1238/מכשירי-מדידה-ובדיקה",
              "chainHints": {
                "ramiLevy": [
                  "937"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1238/מכשירי-מדידה-ובדיקה/בדיקות-הריון-וביוץ",
              "nameHe": "בדיקות הריון וביוץ",
              "nameEn": "בדיקות הריון וביוץ",
              "parentId": "dept/מחלקה-1238/מכשירי-מדידה-ובדיקה",
              "chainHints": {
                "ramiLevy": [
                  "978"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1238/מכשירי-מדידה-ובדיקה/בדיקות-קורונה",
              "nameHe": "בדיקות קורונה",
              "nameEn": "בדיקות קורונה",
              "parentId": "dept/מחלקה-1238/מכשירי-מדידה-ובדיקה",
              "chainHints": {
                "ramiLevy": [
                  "985"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    },
    {
      "id": "dept/מחלקה-1243",
      "nameHe": "מחלקה 1243",
      "nameEn": "מחלקה 1243",
      "icon": "Package",
      "chainHints": {
        "ramiLevy": [
          "1243"
        ]
      },
      "children": [
        {
          "id": "dept/מחלקה-1243/דגנים-וחטיפי-אנרגיה",
          "nameHe": "דגנים וחטיפי אנרגיה",
          "nameEn": "דגנים וחטיפי אנרגיה",
          "parentId": "dept/מחלקה-1243",
          "chainHints": {
            "ramiLevy": [
              "234"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1243/דגנים-וחטיפי-אנרגיה/דגני-ילדים",
              "nameHe": "דגני ילדים",
              "nameEn": "דגני ילדים",
              "parentId": "dept/מחלקה-1243/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "350"
                ]
              },
              "children": []
            },
            {
              "id": "dept/מחלקה-1243/דגנים-וחטיפי-אנרגיה/חטיפי-אנרגיה",
              "nameHe": "חטיפי אנרגיה ובריאות",
              "nameEn": "חטיפי אנרגיה ובריאות",
              "parentId": "dept/מחלקה-1243/דגנים-וחטיפי-אנרגיה",
              "chainHints": {
                "ramiLevy": [
                  "433"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1243/מאפה-מלוח",
          "nameHe": "פריכיות וקרקרים",
          "nameEn": "פריכיות וקרקרים",
          "parentId": "dept/מחלקה-1243",
          "chainHints": {
            "ramiLevy": [
              "272"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1243/מאפה-מלוח/פתית-לחמית-וצנימים",
              "nameHe": "פתית, לחמית וצנימים",
              "nameEn": "פתית, לחמית וצנימים",
              "parentId": "dept/מחלקה-1243/מאפה-מלוח",
              "chainHints": {
                "ramiLevy": [
                  "312"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1243/מוצרי-הנקה-והאכלה",
          "nameHe": "אביזרי תינוקות",
          "nameEn": "אביזרי תינוקות",
          "parentId": "dept/מחלקה-1243",
          "chainHints": {
            "ramiLevy": [
              "530"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1243/מוצרי-הנקה-והאכלה/כלי-אוכל-וכוסות-שתייה",
              "nameHe": "כלי אוכל וכוסות שתייה",
              "nameEn": "כלי אוכל וכוסות שתייה",
              "parentId": "dept/מחלקה-1243/מוצרי-הנקה-והאכלה",
              "chainHints": {
                "ramiLevy": [
                  "973"
                ]
              },
              "children": []
            }
          ]
        },
        {
          "id": "dept/מחלקה-1243/צעצועים-וטרמפולינות",
          "nameHe": "צעצועים",
          "nameEn": "צעצועים",
          "parentId": "dept/מחלקה-1243",
          "chainHints": {
            "ramiLevy": [
              "533"
            ]
          },
          "children": [
            {
              "id": "dept/מחלקה-1243/צעצועים-וטרמפולינות/משחקי-קופסא",
              "nameHe": "משחקי קופסא",
              "nameEn": "משחקי קופסא",
              "parentId": "dept/מחלקה-1243/צעצועים-וטרמפולינות",
              "chainHints": {
                "ramiLevy": [
                  "1139"
                ],
                "shufersal": [
                  "G230104"
                ]
              },
              "children": []
            }
          ]
        }
      ]
    }
  ];

// ---------------------------------------------------------------------------
// Fallback-leaf synthesis: guarantee every product lands on a TERMINAL node.
// ---------------------------------------------------------------------------
//
// Background: a chain leaf (e.g. Shufersal `A019999`) resolves to a backbone
// node by walking its chain-code prefix until a hint matches. If the only
// matching hint sits on an intermediate group (e.g. `dairy` hinted for `A01`),
// the product would otherwise be assigned to a non-leaf. We don't want that —
// products should sit on leaves so the UI / search / grouping all work.
//
// Fix: for every group that has `chainHints`, synthesise a `<id>/general`
// terminal child unless a `general`/`other`/`misc` terminal already exists.
// The synthesised leaf inherits the parent's hints that NO descendant claims —
// because `collectHintMaps()` keeps the deepest commonId per chain code, those
// codes will naturally resolve to the new leaf, while codes already claimed
// by deeper siblings continue to route to those siblings.

const FALLBACK_ID_REGEX = /\/(general|other|misc)$/;

/** Recursively collect every chainHint code on `node` and all its descendants. */
function collectClaimedCodes(
  node: BackboneNode,
): { shufersal: Set<string>; ramiLevy: Set<string> } {
  const shufersal = new Set<string>();
  const ramiLevy = new Set<string>();
  const visit = (n: BackboneNode): void => {
    if (n.chainHints?.shufersal) for (const c of n.chainHints.shufersal) shufersal.add(c);
    if (n.chainHints?.ramiLevy) for (const c of n.chainHints.ramiLevy) ramiLevy.add(c);
    for (const child of n.children) visit(child);
  };
  for (const child of node.children) visit(child);
  return { shufersal, ramiLevy };
}

function ensureFallbackLeaf(
  node: BackboneNode,
  skipGeneralUnder: ReadonlySet<string>,
): BackboneNode {
  // Recurse first so a synthesised grand-child counts as "claimed" when we
  // decide whether the current group needs its own fallback.
  const processedChildren = node.children.map((c) => ensureFallbackLeaf(c, skipGeneralUnder));

  // Terminal nodes are already valid product landings — nothing to do.
  if (processedChildren.length === 0) return { ...node, children: processedChildren };

  // Internal rule packs may forbid /general under specific groups.
  if (skipGeneralUnder.has(node.id)) {
    return { ...node, children: processedChildren };
  }

  // Intermediate groups always need a fallback target so `terminalLeafFor`
  // can redirect anything that lands on them (whether via a chain hint, an
  // inherited walk-up, a synonym match, or a refine-pass demotion). Skip when
  // an explicit general/other/misc leaf already exists.
  const alreadyHasFallback = processedChildren.some(
    (c) => c.children.length === 0 && FALLBACK_ID_REGEX.test(c.id),
  );
  if (alreadyHasFallback) {
    return { ...node, children: processedChildren };
  }

  // The fallback inherits only the parent's chainHints that NO descendant
  // claims, so the deepest-wins logic in `collectHintMaps()` keeps codes on
  // their specific sibling when one exists. When every code is claimed (or
  // the parent had no chainHints), the fallback is created with an empty
  // hint list — it's only there as a redirect target for the wrapper.
  const claimed = collectClaimedCodes({ ...node, children: processedChildren });
  const unclaimedShufersal = (node.chainHints?.shufersal ?? []).filter(
    (c) => !claimed.shufersal.has(c),
  );
  const unclaimedRamiLevy = (node.chainHints?.ramiLevy ?? []).filter(
    (c) => !claimed.ramiLevy.has(c),
  );
  const fallback: BackboneNode = {
    id: `${node.id}/general`,
    nameHe: 'כללי',
    nameEn: 'General',
    parentId: node.id,
    chainHints:
      unclaimedShufersal.length > 0 || unclaimedRamiLevy.length > 0
        ? { shufersal: unclaimedShufersal, ramiLevy: unclaimedRamiLevy }
        : undefined,
    children: [],
  };
  return { ...node, children: [...processedChildren, fallback] };
}

function ensureFallbackLeaves(
  nodes: readonly BackboneNode[],
  skipGeneralUnder: ReadonlySet<string>,
): BackboneNode[] {
  return nodes.map((n) => ensureFallbackLeaf(n, skipGeneralUnder));
}

const PATCHED_RAW_COMMON_BACKBONE = applyInternalBackboneRules(
  RAW_COMMON_BACKBONE as unknown as import('./apply-backbone-rules.js').BackboneNode[],
) as BackboneNode[];

/**
 * Post-synthesis backbone: `RAW_COMMON_BACKBONE` after internal rule packs,
 * plus auto-added "general" leaves under every group that needs them so every
 * product can land on a terminal. This is the runtime source of truth used by
 * the persister, the mapper, and the public tree shape.
 */
export const COMMON_BACKBONE: ReadonlyArray<BackboneNode> = ensureFallbackLeaves(
  PATCHED_RAW_COMMON_BACKBONE,
  backboneSkipAutoGeneralParents(),
);

/** Walk every node in the backbone. */
export function walkBackbone(visit: (node: BackboneNode, depth: number, ancestors: readonly BackboneNode[]) => void): void {
  function go(node: BackboneNode, depth: number, ancestors: readonly BackboneNode[]): void {
    visit(node, depth, ancestors);
    for (const c of node.children) go(c, depth + 1, [...ancestors, node]);
  }
  for (const r of COMMON_BACKBONE) go(r, 0, []);
}

/** Flat list of all backbone nodes (any depth), in tree order. */
export const COMMON_NODES_FLAT: ReadonlyArray<{
  id: string;
  nameHe: string;
  nameEn: string;
  depth: number;
  parentId?: string;
  groupId: string;
  isTerminal: boolean;
}> = (() => {
  const out: Array<{ id: string; nameHe: string; nameEn: string; depth: number; parentId?: string; groupId: string; isTerminal: boolean }> = [];
  walkBackbone((node, depth, ancestors) => {
    const groupId = ancestors[0]?.id ?? node.id;
    out.push({
      id: node.id,
      nameHe: node.nameHe,
      nameEn: node.nameEn,
      depth,
      parentId: ancestors[ancestors.length - 1]?.id,
      groupId,
      isTerminal: node.children.length === 0,
    });
  });
  return out;
})();

/** Map from id -> name/parent info, for all depths. */
export const COMMON_BY_ID: ReadonlyMap<string, { nameHe: string; nameEn: string; parentId?: string; depth: number; isTerminal: boolean }> =
  new Map(COMMON_NODES_FLAT.map((n) => [n.id, { nameHe: n.nameHe, nameEn: n.nameEn, parentId: n.parentId, depth: n.depth, isTerminal: n.isTerminal }]));

/**
 * Legacy alias for callers that still treat the backbone as 'groups with leaves'.
 * Contains every TERMINAL node (no children) regardless of depth, tagged with
 * its root group id.
 */
export const COMMON_LEAVES: ReadonlyArray<{ id: string; nameHe: string; nameEn: string; groupId: string }> =
  COMMON_NODES_FLAT.filter((n) => n.isTerminal).map((n) => ({ id: n.id, nameHe: n.nameHe, nameEn: n.nameEn, groupId: n.groupId }));

/**
 * Map of intermediate id → its deterministic fallback terminal child id (a
 * sibling whose id ends in `general`/`other`/`misc`). Built once at module
 * init so the redirect helper is O(1).
 */
const FALLBACK_BY_PARENT: ReadonlyMap<string, string> = (() => {
  const out = new Map<string, string>();
  walkBackbone((node) => {
    if (node.children.length === 0) return;
    for (const suffix of ['general', 'other', 'misc'] as const) {
      const candidate = node.children.find(
        (c) => c.children.length === 0 && c.id === `${node.id}/${suffix}`,
      );
      if (candidate) {
        out.set(node.id, candidate.id);
        return;
      }
    }
  });
  return out;
})();

/**
 * Return the terminal backbone id to use for `id`. If `id` is already a
 * terminal, returns `id`. If `id` is an intermediate with a "general" (or
 * "other" / "misc") leaf child, returns that child's id. Otherwise returns
 * `undefined` (caller should clear the assignment or fall back to the
 * catch-all).
 */
export function terminalLeafFor(id: string | null | undefined): string | undefined {
  if (!id) return undefined;
  const info = COMMON_BY_ID.get(id);
  if (!info) return undefined;
  if (info.isTerminal) return id;
  return FALLBACK_BY_PARENT.get(id);
}

/** Convert backbone to the public CommonCategoryNode tree shape. */
export function backboneAsTree(): CommonCategoryNode[] {
  function toPublic(node: BackboneNode, parentId?: string): CommonCategoryNode {
    return {
      id: node.id,
      nameHe: node.nameHe,
      nameEn: node.nameEn,
      icon: node.icon,
      parentId,
      children: node.children.map((c) => toPublic(c, node.id)),
    };
  }
  return COMMON_BACKBONE.map((g) => toPublic(g, undefined));
}
