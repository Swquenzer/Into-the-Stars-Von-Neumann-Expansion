import { GoogleGenAI } from "@google/genai";
import { SolarSystem } from "../types";

// Lazy initialization to avoid errors when API key is missing
let ai: GoogleGenAI | null = null;

const getAI = () => {
  if (!ai && process.env.API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

// Fallback lore descriptions when API is unavailable
const FALLBACK_LORE = [
  "Ancient stellar winds whisper secrets across this forgotten system's cold embrace.",
  "Debris fields orbit silently, remnants of civilizations long turned to cosmic dust.",
  "Gravitational anomalies detected; spacetime ripples through stellar nurseries here.",
  "Binary stars dance eternally, their magnetic fields singing electromagnetic hymns.",
  "Asteroid belts circle like frozen sentinels guarding primordial mysteries within.",
  "Planetary rings shimmer with crystallized volatiles from ancient comet impacts.",
  "Nebular gases swirl in patterns suggesting non-random interference from unknown sources.",
  "Gravitational lensing reveals distorted starlight from the universe's earliest epochs.",
  "Rogue planetoids drift through darkness, ejected by chaotic orbital resonances.",
  "Stellar flares periodically illuminate frozen worlds in brief, violent spectacles.",
  "Magnetic field lines weave intricate patterns through ionized plasma streams.",
  "Proto-planetary disk fragments hint at failed world-formation processes millennia past.",
  "Kuiper belt analogues harbor icy worlds untouched since system formation.",
  "Tidal forces have fractured inner moons into spectacular ring systems.",
  "Heliopause fluctuations suggest interaction with interstellar medium pressure waves.",
  "Gas giant storm systems rage for centuries across ammonia-methane atmospheres.",
  "Trojan asteroids cluster at Lagrange points, stable for billions of years.",
  "Coronal mass ejections paint auroras across magnetospheres of distant worlds.",
  "Barren terrestrial planets show evidence of atmospheric stripping by stellar winds.",
  "Cometary nuclei sublime slowly, creating transient exospheres in deep freeze.",
  "Seismic data patterns suggest geological activity persists on inner rocky bodies.",
  "Orbital mechanics indicate possible perturbing influence from undiscovered massive object.",
  "Spectroscopic analysis reveals exotic mineral compositions in surface regolith layers.",
  "Radiation belts trap charged particles in complex toroidal configurations.",
  "Subsurface oceans might exist beneath ice shells of outer system moons.",
  "Impact craters dot surfaces, each a timeline marker of bombardment history.",
  "Volcanic outgassing continues to reshape atmospheric composition of inner worlds.",
  "Planetary migration evidence suggests chaotic early system evolution and collisions.",
  "Dust clouds scatter starlight creating diffuse halos around distant gas giants.",
  "Cryovolcanic plumes erupt periodically from tidal-heated subsurface reservoirs.",
];

export const generateSystemLore = async (
  system: SolarSystem
): Promise<string> => {
  if (!process.env.API_KEY) {
    return FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
  }

  const metalLevel =
    system.resources.Metal > 70
      ? "rich"
      : system.resources.Metal > 30
      ? "moderate"
      : "poor";
  const plutoniumLevel =
    system.resources.Plutonium > 70
      ? "rich"
      : system.resources.Plutonium > 30
      ? "moderate"
      : "poor";

  const aiInstance = getAI();
  if (!aiInstance) {
    return FALLBACK_LORE[Math.floor(Math.random() * FALLBACK_LORE.length)];
  }

  try {
    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a short, scientific but atmospheric one-sentence log entry (max 20 words) for a probe arriving at a solar system named ${system.name}. 
      The system is ${metalLevel} in metals and ${plutoniumLevel} in radioactive isotopes.`,
    });

    return response.text || "No data available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Communication error with central archives.";
  }
};

export const generateProbeName = async (model: string): Promise<string> => {
  const aiInstance = getAI();
  if (!aiInstance) return `Unit-${Math.floor(Math.random() * 9000) + 1000}`;

  try {
    const response = await aiInstance.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a single cool, sci-fi code name for a ${model} space probe. Just the name, no text.`,
    });
    const text = response.text;
    return text
      ? text.trim()
      : `Unit-${Math.floor(Math.random() * 9000) + 1000}`;
  } catch (e) {
    return `Unit-${Math.floor(Math.random() * 9000) + 1000}`;
  }
};
