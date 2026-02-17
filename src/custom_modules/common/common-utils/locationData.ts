// locationData.ts
export interface LocationEntry {
  city: string;
  county: string;
  state: string;
  postalCode: string;
}

export const US_LOCATIONS: LocationEntry[] = [
  { state: "AR", city: "Bentonville", county: "Benton", postalCode: "72712" },
  { state: "TN", city: "Murfreesboro", county: "Rutherford", postalCode: "37130" },
  // { state: "IA", city: "Dubuque", county: "Dubuque", postalCode: "52001" },
  // { state: "KS", city: "Lawrence", county: "Douglas", postalCode: "66044" },
  // { state: "LA", city: "Lafayette", county: "Lafayette", postalCode: "70501" },
  // { state: "MO", city: "Springfield", county: "Greene", postalCode: "65807" },
  // { state: "OH", city: "Akron", county: "Summit", postalCode: "44301" },
  // { state: "OK", city: "Norman", county: "Cleveland", postalCode: "73069" },
//   { state: "PA", city: "Allentown", county: "Lehigh", postalCode: "18101" }, //let it be commented for now
  // { state: "TX", city: "Amarillo", county: "Potter", postalCode: "79101" }
];