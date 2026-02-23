const ADJECTIVES = [
  "Swift", "Clever", "Bold", "Bright", "Calm",
  "Daring", "Eager", "Fierce", "Gentle", "Happy",
  "Keen", "Lively", "Mighty", "Noble", "Plucky",
  "Quick", "Radiant", "Silent", "Tough", "Vivid",
];

const ANIMALS = [
  "Panda", "Fox", "Owl", "Wolf", "Bear",
  "Hawk", "Lynx", "Otter", "Raven", "Tiger",
  "Dolphin", "Falcon", "Koala", "Parrot", "Seal",
  "Badger", "Crane", "Heron", "Jaguar", "Viper",
];

export function generateFunName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}${animal}`;
}
